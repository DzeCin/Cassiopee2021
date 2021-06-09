const tpTitles: string[] = [
  "Prise en main de PHP et de la boîte à outils Symfony",
  "Programmation contrôleur Web Symfony",
  "Gabarits (templates) Twig",
  "Interfaces habillées en CSS avec Bootstrap",
  "Implémentation d’un CRUD sur ToDo",
  "Sessions, gestion des utilisateurs et autorisations",
  "Implémentation de formulaires pour entités liées",
  "Formulaires dynamiques pour les collections, avec AJAX",
  "Formulaires dynamiques complexes",
];

export function getTpList(): string[] {
  var tpList: string[] = [];
  tpTitles.forEach((title, index) => {
    tpList.push(`TP n°${index + 1} - ${title}`);
  });
  return tpList;
}

export function getTpNumber(tpListElement: string): number {
  return getTpList().indexOf(tpListElement) + 1;
}
