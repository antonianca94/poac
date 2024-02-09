document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('sendProduct');

    const name = document.getElementById('name');
    const categorias = document.getElementById('categorias');
    const price = document.getElementById('price');
    const featured_image = document.getElementById('featured_image');
    const gallery_images = document.getElementById('gallery_images');


    const nameError = document.getElementById('nameError');
    const categoriasError = document.getElementById('categoriasError');
    const priceError = document.getElementById('priceError');
    const featured_imageError = document.getElementById('featured_imageError');
    const gallery_imagesError = document.getElementById('gallery_imagesError');


    form.addEventListener('submit', (e) => {
        validateName(e);
        validateCategorias(e);
        validatePrice(e);
        validateFeaturedImage(e);
        validateGalleryImages(e);
    }) 

    name.addEventListener('input', validateName);
    name.addEventListener('focus', validateName);

    // SELECT2
    $(categorias).on('change', function(e) {
        validateCategorias(e);
    });
    $(categorias).on('select2:open', function(e) {
        validateCategorias(e);
    });
    // SELECT2
    
    price.addEventListener('input', validatePrice);
    price.addEventListener('focus', validatePrice);

    featured_image.addEventListener('input', validateFeaturedImage);
    featured_image.addEventListener('change', validateFeaturedImage);
    featured_image.addEventListener('focus', validateFeaturedImage);

    gallery_images.addEventListener('input', validateGalleryImages);
    gallery_images.addEventListener('change', validateGalleryImages);
    gallery_images.addEventListener('focus', validateGalleryImages);

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
        const categorias_select = document.querySelector('.select2-container--default .select2-selection--single');
        if (categorias.value === '' || categorias.value == null) {
            categorias_select.style.border = "1px solid red"; // Adiciona uma borda vermelha
            categoriasError.classList.add("d-block");
            categoriasError.innerText = 'Insira algo na categoria';
            e.preventDefault();
        } else {
            categorias_select.style.border = "1px solid green"; // Adiciona uma borda vermelha
            categoriasError.classList.remove("d-block");
        }
    }

    function validatePrice(e){
        if (price.value === '' || price.value == null) {
            price.classList.add("is-invalid");
            priceError.classList.add("d-block");
            priceError.innerText = 'Insira algo no Preço';
            e.preventDefault();
        } else {
            price.classList.remove("is-invalid");
            price.classList.add("is-valid");
            priceError.classList.remove("d-block");
        }
    }

    function validateFeaturedImage(e){
        const featured_image_input = document.querySelector('.featured_image_content input.kv-fileinput-caption');
        if (featured_image.value === '' || featured_image.value == null) {
            featured_image_input.classList.add("is-invalid");
            featured_imageError.classList.add("d-block");
            featured_imageError.innerText = 'Insira algo na Imagem Destacada';
            e.preventDefault();
        } else {
            featured_image_input.classList.remove("is-invalid");
            featured_image_input.classList.add("is-valid");
            featured_imageError.classList.remove("d-block");
        }  
    }

    function validateGalleryImages(e){
        const gallery_images_input = document.querySelector('.gallery_images_content input.kv-fileinput-caption');
        if (gallery_images.value === '' || gallery_images.value == null) {
            gallery_images_input.classList.add("is-invalid");
            gallery_imagesError.classList.add("d-block");
            gallery_imagesError.innerText = 'Insira algo na Imagem Destacada';
            e.preventDefault();
        } else {
            gallery_images_input.classList.remove("is-invalid");
            gallery_images_input.classList.add("is-valid");
            gallery_imagesError.classList.remove("d-block");
        }  
    }
})
    