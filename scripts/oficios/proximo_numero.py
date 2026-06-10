#!/usr/bin/env python3
"""
Próximo número livre de ofício do ano. Varre a pasta de Ofícios INTEIRA
(raiz com os do ano corrente soltos + subpastas por ano), captura todos os
números no formato "n. NN-AA", "nº NN-AAAA", "NN-26", "NN/2026" etc. e
devolve o maior+1. Corrige a falha de só olhar nomes parciais.

Uso: proximo_numero.py [ANO]   (ANO padrão = ano corrente; aceita 26 ou 2026)
"""
import sys, re, os, glob, datetime

BASE = "/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP/6 - Atuação extrajudicial e administrativa/Ofícios"

def main():
    ano = sys.argv[1] if len(sys.argv) > 1 else str(datetime.date.today().year)
    a4 = ano if len(ano) == 4 else "20" + ano        # 2026
    a2 = a4[2:]                                        # 26
    # Números: "Oficio (n.|nº)? NN ?-? (AA|AAAA)" — captura NN quando seguido do ano
    rx = re.compile(
        r"(?:of[ií]cio\s*)?n[º.]?\s*0*(\d{1,3})\s*[-/]\s*(?:%s|%s)\b" % (a2, a4),
        re.I)
    # também "NN-2026" ou "NN-26" sem 'oficio'
    rx2 = re.compile(r"\b0*(\d{1,3})\s*[-/]\s*(?:%s|%s)\b" % (a2, a4))
    nums = set()
    arquivos = glob.glob(BASE + "/*") + glob.glob(BASE + f"/{a4}/*")
    for p in arquivos:
        nome = os.path.basename(p)
        for m in rx.finditer(nome):
            nums.add(int(m.group(1)))
        for m in rx2.finditer(nome):
            nums.add(int(m.group(1)))
    usados = sorted(n for n in nums if 1 <= n <= 300)
    prox = (max(usados) + 1) if usados else 1
    print(f"Ano {a4}: usados = {usados}")
    print(f"Maior = {max(usados) if usados else 0}  →  PRÓXIMO LIVRE = {prox}/{a4}")
    return prox

if __name__ == "__main__":
    main()
