const Intro = require("../models/Intro");

const normalizeIntro = (doc) => ({
	id: doc._id,
	name: doc.name,
	dateOfBirth: doc.dateOfBirth,
	address: doc.address,
	phone: doc.phone,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
});

const listIntros = async (req, res, next) => {
	try {
		const intros = await Intro.find().sort({ createdAt: 1 }).lean();
		res.json({
			success: true,
			count: intros.length,
			data: intros.map(normalizeIntro),
		});
	} catch (error) {
		next(error);
	}
};

const createIntro = async (req, res, next) => {
	try {
		const { name, dateOfBirth, address, phone } = req.body;

		if (!name || !dateOfBirth || !address || !phone) {
			res.status(400);
			throw new Error("name, dateOfBirth, address, and phone are required");
		}

		const intro = await Intro.create({
			name,
			dateOfBirth,
			address,
			phone,
		});

		res.status(201).json({
			success: true,
			data: normalizeIntro(intro.toObject()),
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	listIntros,
	createIntro,
};