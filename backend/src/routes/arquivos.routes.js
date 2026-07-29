const { Router } = require('express');
const path = require('path');
const controller = require('../controllers/arquivos.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);
router.post('/', controller.upload.single('file'), controller.create);
router.get('/:id', controller.getById);

module.exports = router;
