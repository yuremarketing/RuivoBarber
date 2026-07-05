// ***********************************************************
// Support file — carregado antes de cada arquivo de spec
// ***********************************************************
import "./commands";

// Ignorar erros de Sentry/rede que não são do nosso código
Cypress.on("uncaught:exception", (err) => {
  // Ignorar erros de SSE/EventSource (conexão em tempo real)
  if (err.message.includes("EventSource") || err.message.includes("MIME")) {
    return false;
  }
  // Ignorar erros do Sentry
  if (err.message.includes("Sentry") || err.message.includes("trim is not a function")) {
    return false;
  }
  // Deixar outros erros quebrarem o teste
  return true;
});
