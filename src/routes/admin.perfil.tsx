import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSession } from "@/hooks/use-admin-role";

export const Route = createFileRoute("/admin/perfil")({ component: ProfilePage });

function ProfilePage() {
  const s = useAdminSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const q = useQuery({
    queryKey: ["admin", "my-profile"],
    enabled: s.status === "admin",
    queryFn: async () => {
      if (s.status !== "admin") return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", s.userId).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (q.data) {
      setName(q.data.full_name ?? "");
      setPhone(q.data.phone ?? "");
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (s.status !== "admin") return;
      const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", s.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (s.status !== "admin") return null;

  return (
    <div>
      <PageHeader
        title="Perfil"
        description="Seus dados como administrador."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gradient-gold text-black hover:opacity-90">
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
          </Button>
        }
      />
      <div className="max-w-lg rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div>
          <Label>Email</Label>
          <Input value={s.email ?? ""} disabled />
        </div>
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
