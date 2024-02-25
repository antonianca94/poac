document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('registerProductor');

    const name = document.getElementById('name');
    const surname = document.getElementById('surname');
    const cpf = document.getElementById('cpf');
    const phone = document.getElementById('phone');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');


    const nameError = document.getElementById('nameError');
    const surnameError = document.getElementById('surnameError');
    const cpfError = document.getElementById('cpfError');
    const phoneError = document.getElementById('phoneError');
    const usernameError = document.getElementById('usernameError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');


    form.addEventListener('submit', (e) => {
        validateName(e);
        validateSurname(e);
        validateCpf(e);
        validatePhone(e);
        validateUsername(e);
        validatePassword(e);
  
    }) 

    name.addEventListener('input', validateName);
    name.addEventListener('focus', validateName);
    surname.addEventListener('input', validateSurname);
    surname.addEventListener('focus', validateSurname);
    cpf.addEventListener('input', validateCpf);
    cpf.addEventListener('focus', validateCpf);
    phone.addEventListener('input', validatePhone);
    phone.addEventListener('focus', validatePhone);
    
    username.addEventListener('input', validateUsername);
    username.addEventListener('focus', validateUsername);

    password.addEventListener('input', validatePassword);
    password.addEventListener('change', validatePassword);
    password.addEventListener('focus', validatePassword);


    function validateName(e){
        if (name.value === '' || name.value == null) {
            name.classList.add("is-invalid");
            nameError.classList.add("d-block");
            nameError.innerText = 'Insira algo no nome';
            e.preventDefault();
        } else {
            name.classList.remove("is-invalid");
            name.classList.add("is-valid");
            nameError.classList.remove("d-block");
        }
    }

    function validateSurname(e){
        if (surname.value === '' || surname.value == null) {
            surname.classList.add("is-invalid");
            surnameError.classList.add("d-block");
            surnameError.innerText = 'Insira algo no sobrenome';
            e.preventDefault();
        } else {
            surname.classList.remove("is-invalid");
            surname.classList.add("is-valid");
            surnameError.classList.remove("d-block");
        }
    }

    function validateCpf(e){
        if (cpf.value === '' || cpf.value == null) {
            cpf.classList.add("is-invalid");
            cpfError.classList.add("d-block");
            cpfError.innerText = 'Insira algo no CPF';
            e.preventDefault();
        } else {
            cpf.classList.remove("is-invalid");
            cpf.classList.add("is-valid");
            cpfError.classList.remove("d-block");
        }
    }

    function validatePhone(e){
        if (phone.value === '' || phone.value == null) {
            phone.classList.add("is-invalid");
            phoneError.classList.add("d-block");
            phoneError.innerText = 'Insira algo no Telefone';
            e.preventDefault();
        } else {
            phone.classList.remove("is-invalid");
            phone.classList.add("is-valid");
            phoneError.classList.remove("d-block");
        }
    }

    function validateUsername(e){
        if (username.value === '' || username.value == null) {
            username.classList.add("is-invalid");
            usernameError.classList.add("d-block");
            usernameError.innerText = 'Insira algo no usuário';
            e.preventDefault();
        } else {
            username.classList.remove("is-invalid");
            username.classList.add("is-valid");
            usernameError.classList.remove("d-block");
        }
    }

    function validatePassword(e){
        if (password.value === '' || password.value == null) {
            password.classList.add("is-invalid");
            passwordError.classList.add("d-block");
            passwordError.innerText = 'Insira algo na senha';
            e.preventDefault();
        } else {
            password.classList.remove("is-invalid");
            password.classList.add("is-valid");
            passwordError.classList.remove("d-block");
        }
    }

})
    