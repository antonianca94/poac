// database.js
const mysql = require('mysql2/promise');

async function executeQuery(sql, values = []) {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'poac'
    });

    try {
        const [result] = await connection.execute(sql, values);
        return result;
    } catch (error) {
        console.error('Erro ao executar consulta SQL:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

module.exports = { executeQuery };
