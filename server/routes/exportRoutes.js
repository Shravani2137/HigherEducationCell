const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const excelService = require("../services/excelService");

// GET /api/export/excel
router.get("/excel", auth, async (req, res) => {
  try {
    const excelUrl = await excelService.syncMasterExcelToDrive();

    if (!excelUrl) {
      return res.status(503).json({
        message:
          "Excel could not be opened because Google Drive is not configured.",
      });
    }

    res.json({ url: excelUrl });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;
