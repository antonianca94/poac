document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('registerProductor');

    const name = document.getElementById('name');
    const role = document.getElementById('role');
    const username = document.getElementById('username');
    const password = document.getElementById('password');


    const nameError = document.getElementById('nameError');
    const roleError = document.getElementById('roleError');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');


    form.addEventListener('submit', (e) => {
        validateName(e);
        validateRole(e);
        validateUsername(e);
        validatePassword(e);
  
    }) 

    name.addEventListener('input', validateName);
    name.addEventListener('focus', validateName);

    // SELECT2
    $(role).on('change', function(e) {
        validateRole(e);
    });
    $(role).on('select2:open', function(e) {
        validateRole(e);
    });
    // SELECT2
    
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

    function validateRole(e){
        const role_select = document.querySelector('.select2-container--default .select2-selection--single');
        if (role.value === '' || role.value == null) {
            role_select.style.border = "1px solid #dc3545"; // Adiciona uma borda vermelha
            roleError.classList.add("d-block");
            roleError.innerText = 'Insira algo na role';
            e.preventDefault();
        } else {
            role_select.style.border = "1px solid #198754"; // Adiciona uma borda vermelha
            roleError.classList.remove("d-block");
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
    