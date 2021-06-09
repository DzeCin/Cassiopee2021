/**
 * An array containing each TP's title.
 */
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

/**
 * Creates and returns a list of all TPs, including their numbers. Used by the Quick Pick selector.
 * @returns an array containing formatted TP titles.
 */
export function getTpList(): string[] {
  var tpList: string[] = [];
  tpTitles.forEach((title, index) => {
    tpList.push(`TP n°${index + 1} - ${title}`);
  });
  return tpList;
}

/**
 * Given a formatted TP title, returns its number.
 *
 * Ex: `getTPNumber("TP n°3 - Gabarits (templates) Twig")` returns 3.
 *
 * @param tpListElement
 * @returns
 */
export function getTpNumber(tpListElement: string): number {
  return getTpList().indexOf(tpListElement) + 1;
}
