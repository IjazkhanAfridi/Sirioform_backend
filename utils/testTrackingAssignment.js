const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testTrackingAssignment = async () => {
  try {
    await connectDB();

    const Discente = require('../models/Discente');

    console.log('🔍 Testing Tracking Assignment Creation...\n');

    // Find a sample discente
    const sampleDiscente = await Discente.findOne();

    if (!sampleDiscente) {
      console.log('❌ No sample discente found.');
      return;
    }

    console.log(
      `📋 Testing with discente: ${sampleDiscente.nome} ${sampleDiscente.cognome}`
    );

    // Create a test tracking assignment
    const testTrackingAssignment = {
      kitNumber: null, // No kit number - this should work now
      courseId: new mongoose.Types.ObjectId(), // Fake course ID
      courseName: 'Test Course',
      courseType: 'Test Type',
      instructorId: null,
      instructorName: '',
      centerId: new mongoose.Types.ObjectId(),
      centerName: 'Test Center',
      assignedDate: new Date(),
      kitType: 'Test Kit Type',
    };

    console.log('📝 Creating test tracking assignment...');

    try {
      // Try to add the assignment
      sampleDiscente.kitAssignments.push(testTrackingAssignment);
      await sampleDiscente.save();

      console.log('✅ Tracking assignment created successfully!');
      console.log('   Kit Number:', testTrackingAssignment.kitNumber);
      console.log('   Course Name:', testTrackingAssignment.courseName);

      // Remove the test assignment
      sampleDiscente.kitAssignments.pop();
      await sampleDiscente.save();
      console.log('🧹 Test assignment cleaned up');
    } catch (error) {
      console.error('❌ Error creating tracking assignment:', error.message);
    }
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
};

// Run the test
testTrackingAssignment();
