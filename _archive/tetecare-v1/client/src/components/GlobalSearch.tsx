import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Dialog, DialogContent } from "./ui/dialog";
import { Search, Loader2, PawPrint, User, Calendar, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "./ui/badge";
import { useLocation } from "wouter";
import { Card } from "./ui/card";

export function GlobalSearch() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: results, isLoading } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const handleSelect = (type: string, id: number) => {
    setOpen(false);
    setQuery("");

    switch (type) {
      case "pet":
        setLocation(`/admin/pets/${id}`);
        break;
      case "tutor":
        setLocation(`/admin/tutors`);
        break;
      case "event":
        setLocation(`/admin/calendar`);
        break;
      case "document":
        setLocation(`/admin/documents`);
        break;
    }
  };

  return (
    <>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar... (Ctrl+K)"
          className="pl-9"
          onFocus={() => setOpen(true)}
          readOnly
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pets, tutores, eventos..."
                className="pl-9 border-0 focus-visible:ring-0"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[60vh] p-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && debouncedQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Digite pelo menos 2 caracteres para buscar</p>
                <p className="text-sm mt-2">
                  Busque por pets, tutores, eventos e documentos
                </p>
              </div>
            )}

            {!isLoading && debouncedQuery.length >= 2 && results && (
              <div className="space-y-4">
                {results.pets && results.pets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Pets
                    </h3>
                    <div className="space-y-2">
                      {results.pets.map((pet: any) => (
                        <Card
                          key={pet.id}
                          className="p-3 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelect("pet", pet.id)}
                        >
                          <div className="flex items-center gap-3">
                            <PawPrint className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium">{pet.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {pet.breed} • {pet.species}
                              </p>
                            </div>
                            <Badge variant="outline">{pet.status}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {results.tutors && results.tutors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Tutores
                    </h3>
                    <div className="space-y-2">
                      {results.tutors.map((tutor: any) => (
                        <Card
                          key={tutor.id}
                          className="p-3 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelect("tutor", tutor.id)}
                        >
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium">{tutor.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {tutor.email}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {results.events && results.events.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Eventos
                    </h3>
                    <div className="space-y-2">
                      {results.events.map((event: any) => (
                        <Card
                          key={event.id}
                          className="p-3 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelect("event", event.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium">{event.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(event.startDate).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {results.documents && results.documents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Documentos
                    </h3>
                    <div className="space-y-2">
                      {results.documents.map((doc: any) => (
                        <Card
                          key={doc.id}
                          className="p-3 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelect("document", doc.id)}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {doc.type}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {debouncedQuery.length >= 2 &&
                  (!results ||
                    ((!results.pets || results.pets.length === 0) &&
                      (!results.tutors || results.tutors.length === 0) &&
                      (!results.events || results.events.length === 0) &&
                      (!results.documents ||
                        results.documents.length === 0))) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum resultado encontrado</p>
                      <p className="text-sm mt-2">
                        Tente buscar por outro termo
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
