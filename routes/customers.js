const router = require('express').Router();
const Customer = require('../models/Customer');
const { CompanyKey } = require('../models/User');

// 1. FETCH CUSTOMERS BY ROLE ACCESS LIMITS (RBAC TIERS)
router.get('/:companyGroup/:userRole/:userId', async (req, res) => {
  const { companyGroup, userRole, userId } = req.params;
  try {
    let query = { companyGroup: companyGroup.toLowerCase().trim() };
    if (userRole === 'Standard Agent') {
      query.assignedTo = userId;
    }
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. ADD SINGLE CUSTOMER LINE ENTRY
router.post('/', async (req, res) => {
  try {
    const cleanGroup = req.body.companyGroup ? req.body.companyGroup.toLowerCase().trim() : 'individual';
    const customerData = { ...req.body, companyGroup: cleanGroup };
    const customer = await Customer.create(customerData);
    res.json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. BULK EXCEL SPREADSHEET ARRAY DATA IMPORTER (DATA MANAGEMENT)
router.post('/bulk-import', async (req, res) => {
  try {
    const { companyGroup, csvRowsList } = req.body;
    if (!Array.isArray(csvRowsList) || csvRowsList.length === 0) {
      return res.status(400).json('Invalid data spreadsheet array records payload.');
    }

    const cleanGroup = companyGroup.toLowerCase().trim();
    const formattedRows = csvRowsList.map(row => ({
      companyGroup: cleanGroup,
      name: row.name || 'Batch Upload Inbound Lead',
      company: row.company || 'N/A',
      email: row.email || '',
      phone: row.phone || '',
      value: Number(row.value) || 0,
      status: row.status || 'Lead',
      summary: row.summary || 'CSV System Bulk Ingested Row File Entry.',
      customFields: row.customFields || {}
    }));

    const insertedData = await Customer.insertMany(formattedRows);
    res.json({ message: `Ingestion engine active: Batched ${insertedData.length} client fields safely!`, count: insertedData.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. UPDATE CORE WORKSPACE ORG META PROPERTIES (SETTINGS ARRAYS)
router.put('/meta-settings/:companyName', async (req, res) => {
  try {
    const { currency, timezone, dealStages, customFieldDefinitions } = req.body;
    const targetCompany = req.params.companyName.toLowerCase().trim();

    const company = await CompanyKey.findOneAndUpdate(
      { name: targetCompany },
      { currency, timezone, dealStages, customFieldDefinitions },
      { new: true }
    );
    res.json({ message: "Workspace administrative meta configurations saved!", company });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. RUN FULL WORKSPACE SYSTEM BACKUP SNAPSHOT DUMP (DATA MANAGEMENT VANS)
router.get('/system-backup/:companyGroup', async (req, res) => {
  try {
    const cleanGroup = req.params.companyGroup.toLowerCase().trim();
    const customerDump = await Customer.find({ companyGroup: cleanGroup });
    
    // Compiles full secure tracking backup array data state payload strings
    res.json({
      backupTimestamp: new Date(),
      organizationSignature: cleanGroup,
      collectionsCount: customerDump.length,
      extractedPayloadSnapshot: customerDump
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. INLINE UPDATE CELL DATA FOR LEAD RECORDS
router.put('/inline-edit/:id', async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      { value: req.body.value, status: req.body.status },
      { new: true }
    );
    res.json(updatedCustomer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. WIPE CUSTOMER RECORD FROM REGISTRY
router.delete('/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Lead successfully removed from active collections." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
