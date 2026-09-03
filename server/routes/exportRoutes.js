const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const excelService = require('../services/excelService');

// GET /api/export/excel
router.get('/excel', auth, async (req, res) => {
    try {
        const buffer = await excelService.generateExcelBuffer();

        // Trigger Google Drive cloud sync as well
        excelService.syncMasterExcelToDrive().catch(err => console.error('Error syncing Excel to Drive:', err));

        const fileName = `HEC_Master_Student_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;
