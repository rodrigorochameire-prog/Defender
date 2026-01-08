// Lista completa de raças de cachorros suportadas
export const DOG_BREEDS = [
  { value: "golden retriever", label: "Golden Retriever" },
  { value: "cavalier king charles spaniel", label: "Cavalier King Charles Spaniel" },
  { value: "vira-lata", label: "Vira-lata / SRD" },
  { value: "shih tzu", label: "Shih Tzu" },
  { value: "beagle", label: "Beagle" },
  { value: "dachshund", label: "Dachshund / Salsicha" },
  { value: "pomeranian", label: "Lulu da Pomerânia / Spitz Alemão" },
  { value: "chihuahua", label: "Chihuahua" },
  { value: "labrador retriever", label: "Labrador Retriever" },
  { value: "yorkshire terrier", label: "Yorkshire Terrier" },
  { value: "pug", label: "Pug" },
  { value: "french bulldog", label: "Buldogue Francês" },
  { value: "german shepherd", label: "Pastor Alemão" },
  { value: "boxer", label: "Boxer" },
  { value: "dalmatian", label: "Dálmata" },
  { value: "cocker spaniel", label: "Cocker Spaniel" },
  { value: "saint bernard", label: "São Bernardo" },
  { value: "siberian husky", label: "Husky Siberiano" },
  { value: "poodle", label: "Poodle" },
  { value: "shiba inu", label: "Shiba Inu" },
  { value: "greyhound", label: "Galgo / Greyhound" },
  { value: "border collie", label: "Border Collie" },
  { value: "alaskan malamute", label: "Malamute do Alasca" },
  { value: "chow chow", label: "Chow Chow" },
] as const;

export type DogBreed = typeof DOG_BREEDS[number]["value"];
