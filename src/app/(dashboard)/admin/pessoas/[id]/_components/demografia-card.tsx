"use client";

import { User, Phone, MapPin, Cake, Tag } from "lucide-react";
import { calcularIdade } from "@/lib/pessoas/calcular-idade";
import { IntelDot } from "@/components/pessoas";
import type { DotLevel } from "@/lib/pessoas/compute-dot-level";

interface Pessoa {
  nome: string;
  dataNascimento?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  nomesAlternativos?: string[] | null;
  avatarDataUrl?: string | null;
  categoriaPrimaria?: string | null;
  confidence?: string | number | null;
}

function formatarData(d?: string | null): string | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

function nivelConfianca(confidence?: string | number | null): DotLevel {
  if (confidence == null) return "none";
  const c = typeof confidence === "string" ? parseFloat(confidence) : confidence;
  if (Number.isNaN(c)) return "none";
  if (c >= 0.95) return "emerald";
  if (c >= 0.75) return "normal";
  return "subtle";
}

/**
 * Cartão de demografia da Ficha 360°: avatar, idade, telefone, endereço,
 * nomes alternativos, categoria. Destaque para réu/vítima/depoentes — os dados
 * de contato são os primeiros que o defensor precisa.
 */
export function DemografiaCard({ pessoa }: { pessoa: Pessoa }) {
  const idade = calcularIdade(pessoa.dataNascimento ?? null);
  const dataNasc = formatarData(pessoa.dataNascimento);
  const alternativos = (pessoa.nomesAlternativos ?? []).filter(Boolean);
  const dot = nivelConfianca(pessoa.confidence);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
      <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Demografia
      </h2>

      <div className="flex gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {pessoa.avatarDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pessoa.avatarDataUrl}
              alt={`Rosto de ${pessoa.nome}`}
              className="h-16 w-16 rounded-lg object-cover ring-2 ring-white shadow-sm dark:ring-neutral-800"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
              <User className="h-7 w-7" />
            </div>
          )}
        </div>

        {/* Dados */}
        <div className="min-w-0 flex-1 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Field icon={Cake} label="Idade">
              {idade != null ? (
                <span className="tabular-nums">
                  {idade} anos
                  {dataNasc && <span className="ml-1 text-neutral-400">({dataNasc})</span>}
                </span>
              ) : (
                <span className="italic text-neutral-400">não informada</span>
              )}
            </Field>

            <Field icon={Phone} label="Telefone">
              {pessoa.telefone ? (
                <a
                  href={`tel:${pessoa.telefone.replace(/\D/g, "")}`}
                  className="text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {pessoa.telefone}
                </a>
              ) : (
                <span className="italic text-neutral-400">não informado</span>
              )}
            </Field>

            {pessoa.categoriaPrimaria && (
              <Field icon={Tag} label="Categoria">
                <span className="inline-flex items-center gap-1">
                  {pessoa.categoriaPrimaria}
                  {dot !== "none" && <IntelDot level={dot} />}
                </span>
              </Field>
            )}
          </div>

          <Field icon={MapPin} label="Endereço">
            {pessoa.endereco ? (
              <span className="break-words">{pessoa.endereco}</span>
            ) : (
              <span className="italic text-neutral-400">não informado</span>
            )}
          </Field>

          {alternativos.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                Também conhecido(a) como
              </span>
              {alternativos.map((alt, i) => (
                <span
                  key={`${alt}-${i}`}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300"
                >
                  {alt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
      <div>
        <span className="sr-only">{label}: </span>
        <span className="text-neutral-700 dark:text-neutral-300">{children}</span>
      </div>
    </div>
  );
}
