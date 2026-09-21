import next from "eslint-config-next";

export default [
  ...next,
  { ignores: [".next/**", "out/**", ".audit/**", ".tools/**", ".agents/**", "docs/**"] },
];
