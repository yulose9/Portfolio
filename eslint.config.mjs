import next from "eslint-config-next";

export default [
  ...next,
  // worker/ is its own project with its own tsconfig and Workers globals;
  // it is linted and type-checked from inside that directory.
  { ignores: [".next/**", "out/**", ".audit/**", ".tools/**", ".agents/**", "docs/**", "worker/**"] },
];
