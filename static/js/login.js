// Lógica específica da tela de login
document.addEventListener('DOMContentLoaded', () => {
    console.log("Tela de Login Carregada");
    
    // Exemplo: Focar no campo usuário ao abrir
    const userInput = document.querySelector('input[name="username"]');
    if(userInput) userInput.focus();
});