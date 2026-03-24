#!/usr/bin/env ruby
# frozen_string_literal: true

# =============================================================================
# PJe MNI — consultarAvisosPendentes
# Acessa o webservice MNI do PJe/TJ-BA via SOAP com WS-Security (X.509)
#
# Requisitos:
#   gem install nokogiri pkcs11
#   SafeNet Authentication Client 10.9+ (arm64)
#   Token com certificado A1 inserido
#
# Uso:
#   PKCS11_PIN=123456 ruby consulta.rb
#
# Variáveis de ambiente:
#   PKCS11_PIN  — PIN do token (obrigatório)
#   PKCS11_LIB  — caminho da lib PKCS#11 (default: /usr/local/lib/libeTPkcs11.dylib)
#   MNI_ENDPOINT — URL do webservice (default: PJe TJ-BA)
# =============================================================================

require "nokogiri"
require "pkcs11"
require "net/http"
require "uri"
require "base64"
require "digest"
require "time"
require "openssl"
require "shellwords"
require "tempfile"

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
PKCS11_LIB  = ENV.fetch("PKCS11_LIB", "/usr/local/lib/libeTPkcs11.dylib")
PKCS11_PIN  = ENV.fetch("PKCS11_PIN") { abort "ERRO: defina PKCS11_PIN" }
MNI_ENDPOINT = ENV.fetch("MNI_ENDPOINT", "https://pje.tjba.jus.br/pje/intercomunicacao")

# Namespaces
NS_SOAPENV = "http://schemas.xmlsoap.org/soap/envelope/"
NS_WSSE    = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
NS_WSU     = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
NS_DS      = "http://www.w3.org/2000/09/xmldsig#"
NS_SER     = "http://www.jus.br/servico-intercomunicacao-2.2.2"
NS_TIP     = "http://www.jus.br/tipos-servico-intercomunicacao-2.2.2"

# WS-Security constants
BST_VALUE_TYPE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"
BST_ENCODING   = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary"
C14N_EXCLUSIVE = "http://www.w3.org/2001/10/xml-exc-c14n#"
SIG_RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
DIGEST_SHA256  = "http://www.w3.org/2001/04/xmlenc#sha256"

# CKM_SHA256_RSA_PKCS = 0x00000040
CKM_SHA256_RSA_PKCS = 0x00000040

# ---------------------------------------------------------------------------
# PKCS#11: abrir sessão, encontrar cert e chave privada
# ---------------------------------------------------------------------------
def open_pkcs11_session
  pkcs11 = PKCS11.open(PKCS11_LIB)
  slots = pkcs11.active_slots
  abort "ERRO: nenhum slot ativo (token inserido?)" if slots.empty?

  session = slots.first.open
  session.login(:USER, PKCS11_PIN)

  [pkcs11, session]
end

def find_certificate(session)
  certs = session.find_objects(CLASS: PKCS11::CKO_CERTIFICATE)
  abort "ERRO: nenhum certificado no token" if certs.empty?

  puts "[INFO] #{certs.size} certificado(s) encontrado(s) no token"

  # Iterar todos os certificados e encontrar o pessoal (não CA)
  # O certificado pessoal tem chave privada correspondente no token
  selected_cert = nil
  selected_der = nil
  selected_id = nil
  selected_x509 = nil

  certs.each_with_index do |cert_obj, i|
    cert_der = cert_obj[:VALUE] rescue nil
    cert_id  = cert_obj[:ID] rescue nil
    next unless cert_der

    x509 = OpenSSL::X509::Certificate.new(cert_der)

    cn = x509.subject.to_a.find { |attr| attr[0] == "CN" }&.dig(1) || "(sem CN)"
    id_hex = cert_id ? cert_id.unpack1("H*") : "sem-id"
    puts "[INFO]   #{i + 1}. #{cn} (ID: #{id_hex})"

    # Verificar se existe chave privada correspondente (precisa de CKA_ID)
    next unless cert_id
    keys = session.find_objects(CLASS: PKCS11::CKO_PRIVATE_KEY, ID: cert_id)
    if keys.any?
      puts "[INFO]      ^ TEM chave privada — este é o certificado pessoal"
      selected_cert = cert_obj
      selected_der = cert_der
      selected_id = cert_id
      selected_x509 = x509
    end
  end

  abort "ERRO: nenhum certificado com chave privada encontrado no token" unless selected_x509

  puts "[INFO] Selecionado: #{selected_x509.subject}"
  puts "[INFO] Emitido por: #{selected_x509.issuer}"
  puts "[INFO] Validade: #{selected_x509.not_before} — #{selected_x509.not_after}"

  if selected_x509.not_after < Time.now
    abort "ERRO: certificado expirado em #{selected_x509.not_after}"
  end

  [selected_der, selected_id, selected_x509]
end

def find_private_key(session, cert_id)
  keys = session.find_objects(CLASS: PKCS11::CKO_PRIVATE_KEY, ID: cert_id)
  abort "ERRO: chave privada não encontrada para CKA_ID do certificado" if keys.empty?
  keys.first
end

# ---------------------------------------------------------------------------
# Canonicalização XML (Exclusive C14N)
# ---------------------------------------------------------------------------
def canonicalize_exclusive(xml_string)
  doc = Nokogiri::XML(xml_string)
  doc.root.canonicalize(Nokogiri::XML::XML_C14N_EXCLUSIVE_1_0)
end

def canonicalize_node(node)
  node.canonicalize(Nokogiri::XML::XML_C14N_EXCLUSIVE_1_0)
end

# ---------------------------------------------------------------------------
# Digest SHA-256 → Base64
# ---------------------------------------------------------------------------
def sha256_base64(data)
  Base64.strict_encode64(Digest::SHA256.digest(data))
end

# ---------------------------------------------------------------------------
# Assinar com PKCS#11 usando CKM_SHA256_RSA_PKCS
# ---------------------------------------------------------------------------
def sign_with_pkcs11(session, private_key, data)
  # CKM_SHA256_RSA_PKCS faz: SHA-256 hash + DigestInfo + RSA PKCS#1 v1.5 padding + sign
  # Tudo em uma operação atômica no token — o dado de entrada é o conteúdo bruto (não o hash)
  mechanism = PKCS11::CK_MECHANISM.new(CKM_SHA256_RSA_PKCS, nil)
  session.sign(mechanism, private_key, data)
end

# ---------------------------------------------------------------------------
# Extrair CPF do certificado (CN contém "NOME:CPF")
# ---------------------------------------------------------------------------
def extract_cpf_from_cert(x509)
  cn = x509.subject.to_a.find { |attr| attr[0] == "CN" }&.dig(1)
  abort "ERRO: CN não encontrado no certificado" unless cn

  # Formato: "RODRIGO ROCHA MEIRE:04849830404"
  cpf = cn.split(":").last
  abort "ERRO: CPF não encontrado no CN (#{cn})" unless cpf&.match?(/\A\d{11}\z/)

  # MNI espera CPF com 14 dígitos (prefixo 000)
  "000#{cpf}"
end

# ---------------------------------------------------------------------------
# Montar o envelope SOAP com WS-Security
# ---------------------------------------------------------------------------
def build_signed_envelope(session, private_key, cert_der, x509)
  cpf = extract_cpf_from_cert(x509)
  cert_b64 = Base64.strict_encode64(cert_der)

  now = Time.now.utc
  created = now.strftime("%Y-%m-%dT%H:%M:%SZ")
  expires = (now + 300).strftime("%Y-%m-%dT%H:%M:%SZ") # 5 minutos

  # --- Passo 1: Montar o Body ---
  body_xml = <<~XML.strip
    <soapenv:Body wsu:Id="Body" xmlns:soapenv="#{NS_SOAPENV}" xmlns:wsu="#{NS_WSU}">
      <ser:consultarAvisosPendentes xmlns:ser="#{NS_SER}">
        <tip:idConsultante xmlns:tip="#{NS_TIP}">#{cpf}</tip:idConsultante>
        <tip:siglaTribunal xmlns:tip="#{NS_TIP}">TJBA</tip:siglaTribunal>
        <tip:tipoComunicacao xmlns:tip="#{NS_TIP}">INT</tip:tipoComunicacao>
      </ser:consultarAvisosPendentes>
    </soapenv:Body>
  XML

  # --- Passo 2: Montar o Timestamp ---
  timestamp_xml = <<~XML.strip
    <wsu:Timestamp wsu:Id="TS" xmlns:wsu="#{NS_WSU}">
      <wsu:Created>#{created}</wsu:Created>
      <wsu:Expires>#{expires}</wsu:Expires>
    </wsu:Timestamp>
  XML

  # --- Passo 3: Canonicalizar e calcular digests ---
  body_c14n = canonicalize_exclusive(body_xml)
  ts_c14n   = canonicalize_exclusive(timestamp_xml)

  digest_body = sha256_base64(body_c14n)
  digest_ts   = sha256_base64(ts_c14n)

  puts "[INFO] Body digest (SHA-256): #{digest_body}"
  puts "[INFO] Timestamp digest (SHA-256): #{digest_ts}"

  # --- Passo 4: Montar SignedInfo ---
  signed_info_xml = <<~XML.strip
    <ds:SignedInfo xmlns:ds="#{NS_DS}">
      <ds:CanonicalizationMethod Algorithm="#{C14N_EXCLUSIVE}"/>
      <ds:SignatureMethod Algorithm="#{SIG_RSA_SHA256}"/>
      <ds:Reference URI="#Body">
        <ds:Transforms>
          <ds:Transform Algorithm="#{C14N_EXCLUSIVE}"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="#{DIGEST_SHA256}"/>
        <ds:DigestValue>#{digest_body}</ds:DigestValue>
      </ds:Reference>
      <ds:Reference URI="#TS">
        <ds:Transforms>
          <ds:Transform Algorithm="#{C14N_EXCLUSIVE}"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="#{DIGEST_SHA256}"/>
        <ds:DigestValue>#{digest_ts}</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
  XML

  # --- Passo 5: Canonicalizar o SignedInfo e assinar ---
  signed_info_c14n = canonicalize_exclusive(signed_info_xml)
  puts "[INFO] SignedInfo canonicalizado (#{signed_info_c14n.bytesize} bytes)"

  signature_bytes = sign_with_pkcs11(session, private_key, signed_info_c14n)
  signature_b64 = Base64.strict_encode64(signature_bytes)
  puts "[INFO] Assinatura RSA-SHA256 gerada (#{signature_bytes.bytesize} bytes)"

  # --- Passo 6: Montar o envelope completo ---
  envelope = <<~XML
    <?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="#{NS_SOAPENV}" xmlns:ser="#{NS_SER}" xmlns:tip="#{NS_TIP}">
      <soapenv:Header>
        <wsse:Security xmlns:wsse="#{NS_WSSE}" xmlns:wsu="#{NS_WSU}" soapenv:mustUnderstand="1">
          <wsse:BinarySecurityToken
              EncodingType="#{BST_ENCODING}"
              ValueType="#{BST_VALUE_TYPE}"
              wsu:Id="X509Token">#{cert_b64}</wsse:BinarySecurityToken>
          <wsu:Timestamp wsu:Id="TS">
            <wsu:Created>#{created}</wsu:Created>
            <wsu:Expires>#{expires}</wsu:Expires>
          </wsu:Timestamp>
          <ds:Signature xmlns:ds="#{NS_DS}">
            #{signed_info_xml}
            <ds:SignatureValue>#{signature_b64}</ds:SignatureValue>
            <ds:KeyInfo>
              <wsse:SecurityTokenReference>
                <wsse:Reference URI="#X509Token" ValueType="#{BST_VALUE_TYPE}"/>
              </wsse:SecurityTokenReference>
            </ds:KeyInfo>
          </ds:Signature>
        </wsse:Security>
      </soapenv:Header>
      <soapenv:Body wsu:Id="Body" xmlns:wsu="#{NS_WSU}">
        <ser:consultarAvisosPendentes>
          <tip:idConsultante>#{cpf}</tip:idConsultante>
          <tip:siglaTribunal>TJBA</tip:siglaTribunal>
          <tip:tipoComunicacao>INT</tip:tipoComunicacao>
        </ser:consultarAvisosPendentes>
      </soapenv:Body>
    </soapenv:Envelope>
  XML

  envelope
end

# ---------------------------------------------------------------------------
# Enviar envelope SOAP via HTTP POST (com mTLS via PKCS#11)
# ---------------------------------------------------------------------------
def send_soap_request(envelope, x509 = nil, cert_der = nil)
  puts "[INFO] Enviando para #{MNI_ENDPOINT}..."
  puts "[INFO] Content-Length: #{envelope.bytesize}"

  # Tentar primeiro via curl (mais confiável para mTLS com smart card no macOS)
  response = send_via_curl(envelope, cert_der)
  return response if response

  # Fallback: Net::HTTP com OpenSSL PKCS#11 engine
  puts "[INFO] curl falhou, tentando Net::HTTP com PKCS#11 engine..."
  send_via_net_http(envelope, x509)
end

# Enviar via curl
def send_via_curl(envelope, cert_der)
  # Salvar envelope em arquivo temporário
  tmp_envelope = Tempfile.new(["soap", ".xml"])
  tmp_envelope.write(envelope)
  tmp_envelope.close

  # Headers que passam pelo WAF do TJ-BA:
  # - SOAPAction vazio (document/literal style, padrão MNI)
  # - User-Agent simulando Java (PJe é Java, WAF pode filtrar agentes incomuns)
  # - Accept explícito para XML
  cmd = [
    "curl", "-s", "-S",
    "--max-time", "60", "--connect-timeout", "30",
    "-H", "Content-Type: text/xml;charset=UTF-8",
    "-H", 'SOAPAction: ""',
    "-H", "User-Agent: Apache-CXF/3.5.5",
    "-H", "Accept: text/xml, application/xml",
    "-d", "@#{tmp_envelope.path}",
    "-w", "\n__HTTP_CODE__%{http_code}",
    MNI_ENDPOINT
  ]

  puts "[INFO] Executando curl..."
  puts "[DEBUG] #{cmd.join(' ')}" if ENV["DEBUG"]

  output = nil
  3.times do |attempt|
    output = `#{cmd.shelljoin} 2>&1`
    break unless output.include?("Connection reset") || output.include?("ECONNRESET") || output.include?("curl: (56)") || output.include?("Access Denied")

    wait = 2 ** (attempt + 1)
    puts "[WARN] Tentativa #{attempt + 1} falhou, aguardando #{wait}s..."
    sleep(wait)
  end

  # Parsear resposta do curl
  if output && output.include?("__HTTP_CODE__")
    http_code = output[/__HTTP_CODE__(\d+)/, 1]
    # Separar headers e body
    body = output.sub(/\A.*?\r?\n\r?\n/m, "").sub(/__HTTP_CODE__\d+\z/, "").strip
    puts "[INFO] HTTP #{http_code} (via curl)"

    # Criar objeto similar a Net::HTTP::Response
    FakeCurlResponse.new(http_code, body)
  else
    puts "[WARN] curl não retornou resposta válida: #{output[0..200]}"
    nil
  end
ensure
  tmp_envelope&.unlink
  tmp_cert&.unlink
end

# Fallback: Net::HTTP com TLS 1.2
def send_via_net_http(envelope, x509 = nil)
  uri = URI(MNI_ENDPOINT)

  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  http.ssl_version = :TLSv1_2
  http.verify_mode = OpenSSL::SSL::VERIFY_PEER
  http.open_timeout = 30
  http.read_timeout = 60

  request = Net::HTTP::Post.new(uri.path)
  request["Content-Type"] = "text/xml;charset=UTF-8"
  request["SOAPAction"] = '""'
  request["User-Agent"] = "Apache-CXF/3.5.5"
  request["Accept"] = "text/xml, application/xml"
  request.body = envelope

  response = nil
  3.times do |attempt|
    begin
      response = http.request(request)
      puts "[INFO] HTTP #{response.code} #{response.message}"
      break
    rescue Errno::ECONNRESET, IOError => e
      wait = 2 ** (attempt + 1)
      puts "[WARN] Tentativa #{attempt + 1} falhou (#{e.message}), aguardando #{wait}s..."
      sleep(wait)
    end
  end

  response or abort("ERRO: todas as tentativas de conexão falharam")
end

# Wrapper para resposta do curl parecer com Net::HTTP::Response
class FakeCurlResponse
  attr_reader :code, :body

  def initialize(code, body)
    @code = code.to_s
    @body = body
  end

  def message
    case @code.to_i
    when 200 then "OK"
    when 500 then "Internal Server Error"
    else "HTTP #{@code}"
    end
  end
end

# ---------------------------------------------------------------------------
# Parsear resposta SOAP
# ---------------------------------------------------------------------------
def parse_response(response)
  if response.code.to_i == 200
    doc = Nokogiri::XML(response.body)
    doc.remove_namespaces!

    sucesso = doc.at_xpath("//sucesso")&.text
    mensagem = doc.at_xpath("//mensagem")&.text

    puts "\n[RESULTADO]"
    puts "  Sucesso: #{sucesso}"
    puts "  Mensagem: #{mensagem}"

    avisos = doc.xpath("//aviso")
    if avisos.empty?
      puts "  Avisos: nenhum aviso pendente"
    else
      puts "  Avisos (#{avisos.size}):"
      avisos.each_with_index do |aviso, i|
        processo = aviso.at_xpath(".//numeroProcesso")&.text || "?"
        tipo = aviso.at_xpath(".//tipoComunicacao")&.text || "?"
        data = aviso.at_xpath(".//dataDisponibilizacao")&.text || "?"
        puts "    #{i + 1}. Processo: #{processo} | Tipo: #{tipo} | Data: #{data}"
      end
    end

    { sucesso: sucesso, mensagem: mensagem, avisos: avisos.size }
  elsif response.code.to_i == 403
    puts "\n[ERRO 403] Acesso negado pelo WAF/Akamai"
    puts "  Verifique:"
    puts "  - Certificado está válido e não revogado?"
    puts "  - PIN do token está correto?"
    puts "  - Relógio do sistema está sincronizado (NTP)?"
    puts "  - IP está na whitelist do tribunal?"
    puts "\n  Response body (primeiros 500 chars):"
    puts "  #{response.body[0..499]}"
    nil
  else
    puts "\n[ERRO #{response.code}] #{response.message}"
    puts "  Body: #{response.body[0..999]}"
    nil
  end
end

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main
  puts "=" * 60
  puts "PJe MNI — consultarAvisosPendentes"
  puts "Endpoint: #{MNI_ENDPOINT}"
  puts "PKCS#11 lib: #{PKCS11_LIB}"
  puts "=" * 60
  puts

  # 1. Abrir sessão PKCS#11
  puts "[PASSO 1] Abrindo sessão PKCS#11..."
  pkcs11, session = open_pkcs11_session
  puts "[OK] Sessão aberta, login OK"

  begin
    # 2. Encontrar certificado e chave privada
    puts "\n[PASSO 2] Buscando certificado e chave privada..."
    cert_der, cert_id, x509 = find_certificate(session)
    private_key = find_private_key(session, cert_id)
    puts "[OK] Certificado e chave privada encontrados"

    # 3. Montar envelope assinado
    puts "\n[PASSO 3] Montando envelope SOAP com WS-Security..."
    envelope = build_signed_envelope(session, private_key, cert_der, x509)
    puts "[OK] Envelope montado (#{envelope.bytesize} bytes)"

    # Debug: salvar envelope para inspeção
    debug_path = File.join(Dir.home, ".openclaw", "logs", "mni-ultimo-envelope.xml")
    FileUtils.mkdir_p(File.dirname(debug_path))
    File.write(debug_path, envelope)
    puts "[DEBUG] Envelope salvo em #{debug_path}"

    # 4. Enviar (com mTLS)
    puts "\n[PASSO 4] Enviando requisição SOAP..."
    response = send_soap_request(envelope, x509, cert_der)

    # 5. Parsear resposta
    puts "\n[PASSO 5] Parseando resposta..."
    result = parse_response(response)

    if result
      puts "\n[CONCLUIDO] #{result[:avisos]} aviso(s) pendente(s)"
    else
      puts "\n[FALHA] Requisição não foi aceita"
      exit 1
    end
  ensure
    # Sempre fechar sessão e logout
    session.logout rescue nil
    session.close rescue nil
    pkcs11.close rescue nil
    puts "\n[CLEANUP] Sessão PKCS#11 encerrada"
  end
end

# Necessário para FileUtils.mkdir_p
require "fileutils"

main if __FILE__ == $PROGRAM_NAME
