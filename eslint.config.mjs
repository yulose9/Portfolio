import next from "eslint-config-next";

export default [
  ...next,
  {
    files: ["components/seneca/**", "lib/seneca/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // worker/ is its own project with its own tsconfig and Workers globals;
  // it is linted and type-checked from inside that directory.
  { ignores: [".next/**", "out/**", ".audit/**", ".tools/**", ".agents/**", "docs/**", "worker/**"] },
];
