import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const documentSchema = new Schema(
    {
        _id: { type: String },
        name: { type: String, required: true },
        key: { type: String, required: true },
        userId: { type: String, ref: 'User' }, // No longer required
        visitorId: { type: String }, // For analytics
        createdAt: { type: Date, required: true },
        updatedAt: { type: Date, required: true },
    },
    { collection: 'document' }
);

const Document = model('Document', documentSchema);

export { Document }; 