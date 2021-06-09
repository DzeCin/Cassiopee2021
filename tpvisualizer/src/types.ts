export type Step = {
  title: string; // .outline-2 h2
  description: string; // .outline-2 .outline-text-2
  substeps: string[]; // .outline-2 .outline-3
};

export type TP = {
  title: string; // .title
  subtitle: string; // .subtitle
  steps: Step[]; // .outline-2
};
