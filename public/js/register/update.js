document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('updateProductor');

    const fields = {
        name: { element: document.getElementById('name'), error: document.getElementById('nameError'), message: 'Insira algo no nome' },
        surname: { element: document.getElementById('surname'), error: document.getElementById('surnameError'), message: 'Insira algo no sobrenome' },
        cpf: { element: document.getElementById('cpf'), error: document.getElementById('cpfError'), message: 'Insira algo no CPF' },
        phone: { element: document.getElementById('phone'), error: document.getElementById('phoneError'), message: 'Insira algo no Telefone' },
        username: { element: document.getElementById('username'), error: document.getElementById('usernameError'), message: 'Insira algo no usuário' },
        email: { element: document.getElementById('email'), error: document.getElementById('emailError'), message: 'Insira algo no e-mail' },
        password: { element: document.getElementById('password'), error: document.getElementById('passwordError'), message: 'Insira algo na senha' },
        cnpj: { element: document.getElementById('cnpj'), error: document.getElementById('cnpjError'), message: 'Insira algo no CNPJ' },
        company_name: { element: document.getElementById('company_name'), error: document.getElementById('company_nameError'), message: 'Insira algo no Nome da Empresa' },
        cep: { element: document.getElementById('cep'), error: document.getElementById('cepError'), message: 'Insira algo no CEP' },
        street: { element: document.getElementById('street'), error: document.getElementById('streetError'), message: 'Insira algo na Rua' },
        neighborhood: { element: document.getElementById('neighborhood'), error: document.getElementById('neighborhoodError'), message: 'Insira algo no Bairro' },
        city: { element: document.getElementById('city'), error: document.getElementById('cityError'), message: 'Insira algo na Cidade' },
        state: { element: document.getElementById('state'), error: document.getElementById('stateError'), message: 'Insira algo no Estado' },
    };

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        let allFieldsValid = true; // Variável para verificar se todos os campos são válidos
        Object.values(fields).forEach(field => {
            validateField(field); // Validar cada campo
            if (field.element.value.trim() === '') {
                allFieldsValid = false; // Se um campo estiver vazio, definir como false
            }
        });

        if (allFieldsValid) {
            // Se todos os campos forem válidos, você pode prosseguir com o envio do formulário
            form.submit();
        } else {
            // Se algum campo estiver vazio, você pode exibir uma mensagem ou tomar outra ação adequada
            console.log('Por favor, preencha todos os campos antes de enviar.');
        }
    });

    Object.values(fields).forEach(field => {
        field.element.addEventListener('input', function() { validateField(field); });
        field.element.addEventListener('focus', function() { validateField(field); });
    });

    function validateField(field) {
        if (field.element.value.trim() === '') {
            field.element.classList.add("is-invalid");
            field.error.classList.add("d-block");
            field.error.innerText = field.message;
        } else {
            field.element.classList.remove("is-invalid");
            field.element.classList.add("is-valid");
            field.error.classList.remove("d-block");
        }
    }
});
