import { LugarForm } from "@/components/lugares/lugar-form";

export default function NovoLugarPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Novo lugar</h1>
      <LugarForm mode="create" />
    </div>
  );
}
