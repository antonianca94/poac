document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('sendRoles');

    const name = document.getElementById('name');
    const description = document.getElementById('description');



    const nameError = document.getElementById('nameError');
    const descriptionError = document.getElementById('descriptionError');



    form.addEventListener('submit', (e) => {
        validateName(e);
        validateDescription(e);
    }) 

    name.addEventListener('input', validateName);
    name.addEventListener('focus', validateName);

    description.addEventListener('input', validateDescription);
    description.addEventListener('focus', validateDescription);

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

    function validateDescription(e){
        if (description.value === '' || description.value == null) {
            description.classList.add("is-invalid");
            descriptionError.classList.add("d-block");
            descriptionError.innerText = 'Insira algo na descrição';
            e.preventDefault();
        } else {
            description.classList.remove("is-invalid");
            description.classList.add("is-valid");
            descriptionError.classList.remove("d-block");
        }
    }

})
    