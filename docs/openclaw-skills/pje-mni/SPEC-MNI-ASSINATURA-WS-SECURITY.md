# SPEC: Assinatura WS-Security para MNI/PJe

## Status: EM CORREÇÃO

## Problema

O PJe do TJ-BA (via Akamai/WAF) rejeita a assinatura WS-Security do envelope SOAP
com HTTP 403 — Access Denied — Signature ID: 1030010002.

## O que funciona

- Token SafeNet Authentication Client 10.9 arm64 nativo carrega OK
- Certificado `RODRIGO ROCHA MEIRE:04849830404` é identificado no slot 0
- Chave privada é correspondida por CKA_ID
- Conexão HTTPS chega ao PJe (TLS handshake OK)

## O que falha

```
HTTP 403 - Access Denied
Signature ID: 1030010002
```

O WAF (Akamai) do PJe valida a assinatura WS-Security antes mesmo de chegar ao
application server. Uma assinatura mal-formada é rejeitada na camada WAF.

## Causa raiz (3 problemas)

### 1. Falta canonicalização C14N Exclusive

O Body e o SignedInfo devem ser canonicalizados com **Exclusive XML Canonicalization**
(http://www.w3.org/2001/10/xml-exc-c14n#) antes de calcular o digest e assinar.

Sem canonicalização:
- Namespaces desnecessários ficam no XML
- A ordem dos atributos pode variar
- O digest calculado não corresponde ao que o servidor espera

**Solução**: Usar `nokogiri` para `c14n(Nokogiri::XML::XML_C14N_EXCLUSIVE_1_0)`.

### 2. Mecanismo PKCS#11 errado

O mecanismo de assinatura deve ser **CKM_SHA256_RSA_PKCS** (0x00000040), não
CKM_RSA_PKCS (0x00000001).

Com CKM_RSA_PKCS, o token assina o blob bruto sem fazer o hash SHA-256 internamente,
produzindo uma assinatura RSA pura que não corresponde ao `SignatureMethod` declarado
(`rsa-sha256`).

**Solução**: Usar `CKM_SHA256_RSA_PKCS` que faz hash + padding + assinatura em um passo.

### 3. KeyInfo não referencia o BinarySecurityToken

O `<ds:KeyInfo>` deve conter um `<wsse:SecurityTokenReference>` com `<wsse:Reference>`
apontando para o `<wsse:BinarySecurityToken>` pelo `wsu:Id`.

Sem isso, o servidor não sabe qual certificado usar para validar a assinatura.

## Estrutura XML correta (envelope SOAP com WS-Security)

```xml
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:ser="http://www.jus.br/servico-intercomunicacao-2.2.2"
    xmlns:tip="http://www.jus.br/tipos-servico-intercomunicacao-2.2.2">
  <soapenv:Header>
    <wsse:Security
        xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
        xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
        soapenv:mustUnderstand="1">

      <!-- Certificado X.509 em Base64 -->
      <wsse:BinarySecurityToken
          EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary"
          ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"
          wsu:Id="X509Token">
        {CERTIFICADO_BASE64}
      </wsse:BinarySecurityToken>

      <!-- Timestamp -->
      <wsu:Timestamp wsu:Id="TS">
        <wsu:Created>{UTC_CREATED}</wsu:Created>
        <wsu:Expires>{UTC_EXPIRES}</wsu:Expires>
      </wsu:Timestamp>

      <!-- Assinatura -->
      <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:SignedInfo>
          <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>

          <!-- Reference ao Body -->
          <ds:Reference URI="#Body">
            <ds:Transforms>
              <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </ds:Transforms>
            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <ds:DigestValue>{DIGEST_BODY_SHA256_BASE64}</ds:DigestValue>
          </ds:Reference>

          <!-- Reference ao Timestamp -->
          <ds:Reference URI="#TS">
            <ds:Transforms>
              <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </ds:Transforms>
            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <ds:DigestValue>{DIGEST_TS_SHA256_BASE64}</ds:DigestValue>
          </ds:Reference>
        </ds:SignedInfo>

        <ds:SignatureValue>{ASSINATURA_RSA_SHA256_BASE64}</ds:SignatureValue>

        <ds:KeyInfo>
          <wsse:SecurityTokenReference>
            <wsse:Reference
                URI="#X509Token"
                ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/>
          </wsse:SecurityTokenReference>
        </ds:KeyInfo>
      </ds:Signature>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body wsu:Id="Body"
      xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <ser:consultarAvisosPendentes>
      <tip:idConsultante>{CPF_14_DIGITOS}</tip:idConsultante>
      <tip:siglaTribunal>TJBA</tip:siglaTribunal>
      <tip:tipoComunicacao>INT</tip:tipoComunicacao>
    </ser:consultarAvisosPendentes>
  </soapenv:Body>
</soapenv:Envelope>
```

## Fluxo de assinatura (ordem das operações)

1. Montar o Body XML completo (com `wsu:Id="Body"`)
2. Montar o Timestamp (com `wsu:Id="TS"`)
3. Canonicalizar o Body com C14N Exclusive → calcular SHA-256 → Base64 = DigestValue do Body
4. Canonicalizar o Timestamp com C14N Exclusive → calcular SHA-256 → Base64 = DigestValue do TS
5. Montar o `<ds:SignedInfo>` com os DigestValues calculados
6. Canonicalizar o SignedInfo com C14N Exclusive
7. Assinar o SignedInfo canonicalizado com CKM_SHA256_RSA_PKCS via PKCS#11
8. Base64 da assinatura = SignatureValue
9. Montar o envelope completo e enviar

## Gems necessárias

```ruby
# Gemfile
source "https://rubygems.org"

gem "nokogiri"   # Canonicalização XML C14N
gem "pkcs11"     # Acesso ao token SafeNet via PKCS#11
gem "net-http"   # HTTP client (stdlib)
```

## Referências

- WS-Security 1.0: https://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0.pdf
- MNI 2.2.2 WSDL: https://pje.tjba.jus.br/pje/intercomunicacao?wsdl
- X.509 Token Profile: https://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0.pdf
- Exclusive C14N: https://www.w3.org/TR/xml-exc-c14n/
- PKCS#11 v2.40 mechanisms: http://docs.oasis-open.org/pkcs11/pkcs11-curr/v2.40/pkcs11-curr-v2.40.html
