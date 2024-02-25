const { executeQuery } = require('../db');

// Função para obter todas as categorias
const getAllVendors = async (req, res) => {
    try {
        const vendors = await executeQuery('SELECT * FROM vendors');
        const successMessage = req.flash('success'); 
        res.render('vendors/index', { pageTitle: 'Produtores', vendors, successMessage, username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar Produtores');
    }
};

// Função para excluir uma categoria
const deleteVendor = async (req, res) => {
    const vendorId = req.params.id;
    try {
        await executeQuery('DELETE FROM vendors WHERE id = ?', [vendorId]);
        res.status(200).json({ message: 'Produtor excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir o Produtor:', error);
        res.status(500).json({ error: 'Erro ao excluir o Produtor' });
    }
};

module.exports = {
    getAllVendors,
    deleteVendor
};
