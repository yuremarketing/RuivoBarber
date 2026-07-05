const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3000",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: "cypress/support/e2e.js",
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 12000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    viewportWidth: 1280,
    viewportHeight: 800,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      // Credenciais de teste (sobrescritas em CI via env vars)
      ADMIN_LOGIN: "agentAdmin",
      ADMIN_SENHA: "senha123",
      BARBEIRO_LOGIN: "barbeiro_teste",
      BARBEIRO_SENHA: "senha123",
      CLIENTE_LOGIN: "cliente_e2e",
      CLIENTE_SENHA: "senha123",
      API_URL: process.env.VITE_API_URL || "http://localhost:8080/api/v1",
    },
  },
});
