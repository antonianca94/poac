document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('sendProduct');

    const name = document.getElementById('name');
    const categorias = document.getElementById('categorias');

    const nameError = document.getElementById('nameError');
    const categoriasError = document.getElementById('categoriasError');

    form.addEventListener('submit', (e) => {
        validateName(e);
        validateCategorias(e);
    }) 

    name.addEventListener('input', validateName);
    name.addEventListener('focus', validateName);
    categorias.addEventListener('input', validateCategorias);
    categorias.addEventListener('focus', validateCategorias);

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
    
    function validateCategorias(e){
        if (categorias.value === '' || categorias.value == null) {
            categorias.classList.add("is-invalid");
            categoriasError.classList.add("d-block");
            categoriasError.innerText = 'Insira algo na categoria';
            e.preventDefault();
        } else {
            categorias.classList.remove("is-invalid");
            categorias.classList.add("is-valid");
            categoriasError.classList.remove("d-block");
        }
    }
})
    