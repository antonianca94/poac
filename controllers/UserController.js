const { executeQuery } = require('../db');

// Função para obter todos os usuários
const getAllUsers = async (req, res) => {
    try {
        const users = await executeQuery('SELECT users.*, roles.name AS role_name FROM users INNER JOIN roles ON users.roles_id = roles.id');
        const successMessage = req.flash('success'); 
        res.render('users/index', { pageTitle: 'Usuários', users, successMessage, username: req.user.username, userRole: req.user.roles_id });

    } catch (error) {
        res.status(500).send('Erro ao buscar usuários');
    }
};

// Função para exibir o formulário de criação de novo usuário
const showNewUserForm = async (req, res) => {
    const roles = await executeQuery('SELECT * FROM roles');
    res.render('users/new', { pageTitle: 'Inserir Usuário' , roles, username: req.user.username, userRole: req.user.roles_id });
};

// Função para criar um novo usuário
const createUser = async (req, res) => {
    const { name, username, role, password } = req.body;
    const userId = req.session.passport.user; 

    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }

    try {
        await executeQuery('INSERT INTO users (name, username, roles_id, password) VALUES (?, ?, ?, ?)', [name, username, role, password]);
        req.flash('success', 'Usuário cadastrado com sucesso!');
        res.redirect('/users');
    } catch (error) {
        console.error('Erro ao cadastrar o Usuário:', error);
        res.status(500).send('Erro ao cadastrar o Usuário');
    }
};

// Função para excluir um usuário
const deleteUser = async (req, res) => {
    const userId = req.params.id;
    console.log(userId);
    try {
        await executeQuery('DELETE FROM users WHERE id = ?', [userId]);
        res.status(200).json({ message: 'Usuário excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir o Usuário:', error);
        res.status(500).json({ error: 'Erro ao excluir o Usuário' });
    }
};

// Função para exibir o formulário de edição de usuário
const showEditUserForm = async (req, res) => {
    const userId = req.params.id;
    try {
        const [user] = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
        const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [user.roles_id]);
        const roles = await executeQuery('SELECT * FROM roles');
        res.render('users/edit', { pageTitle: 'Editar Usuário', user, role, roles, username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar usuário para edição');
    }
};

// Função para atualizar um usuário
const updateUser = async (req, res) => {
    const userId = req.params.id;

    const { username, password, name, role } = req.body;
    try {
        await executeQuery('UPDATE users SET username = ?, password = ?, name = ? , roles_id = ? WHERE id = ?', [username, password, name, role, userId]);
        req.flash('success', 'Usuário atualizado com sucesso!');
        res.redirect('/users');
    } catch (error) {
        res.status(500).send('Erro ao atualizar a Usuário');
    }
};

module.exports = {
    getAllUsers,
    showNewUserForm,
    createUser,
    deleteUser,
    showEditUserForm,
    updateUser
};
