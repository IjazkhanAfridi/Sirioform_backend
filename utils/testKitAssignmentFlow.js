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

const testKitAssignmentFlow = async () => {
  try {
    await connectDB();

    const Discente = require('../models/Discente');
    const Course = require('../models/Course');
    const Kit = require('../models/Kit');

    console.log('🔍 Testing Kit Assignment Flow...\n');

    // Find a sample discente
    const sampleDiscente = await Discente.findOne();

    if (!sampleDiscente) {
      console.log('❌ No sample discente found.');
      return;
    }

    console.log(
      `📋 Testing with discente: ${sampleDiscente.nome} ${sampleDiscente.cognome}`
    );
    console.log(
      `   Current Kit Assignments: ${sampleDiscente.kitAssignments.length}\n`
    );

    // Show current assignments
    if (sampleDiscente.kitAssignments.length > 0) {
      console.log('📂 Current Kit Assignments:');
      sampleDiscente.kitAssignments.forEach((assignment, index) => {
        console.log(
          `   ${index + 1}. Course: ${assignment.courseName || 'Unknown'}`
        );
        console.log(
          `      Kit Number: ${assignment.kitNumber || 'NOT ASSIGNED'}`
        );
        console.log(`      Kit Type: ${assignment.kitType}`);
        console.log(`      Assigned: ${assignment.assignedDate}`);
        console.log(
          `      Completed: ${
            assignment.courseCompletedDate || 'Not completed'
          }`
        );
        console.log('');
      });
    }

    // Test scenarios
    console.log('📝 Test Scenarios:');
    console.log(
      '   1. Tracking assignments without kit numbers should exist for active courses'
    );
    console.log(
      '   2. Kit number assignments should update existing tracking assignments'
    );
    console.log(
      '   3. Expiration checking should work with both types of assignments'
    );
    console.log('');

    // Count assignments without kit numbers (tracking only)
    const trackingAssignments = sampleDiscente.kitAssignments.filter(
      (assignment) =>
        !assignment.kitNumber || assignment.kitNumber.trim() === ''
    );

    // Count assignments with kit numbers
    const kitNumberAssignments = sampleDiscente.kitAssignments.filter(
      (assignment) => assignment.kitNumber && assignment.kitNumber.trim() !== ''
    );

    console.log(`📊 Assignment Summary:`);
    console.log(
      `   Tracking assignments (no kit number): ${trackingAssignments.length}`
    );
    console.log(`   Kit number assignments: ${kitNumberAssignments.length}`);
    console.log(
      `   Total assignments: ${sampleDiscente.kitAssignments.length}`
    );
    console.log('');

    console.log('✅ Kit assignment flow analysis completed!\n');
  } catch (error) {
    console.error('❌ Error testing kit assignment flow:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
};

// Run the test
testKitAssignmentFlow();
