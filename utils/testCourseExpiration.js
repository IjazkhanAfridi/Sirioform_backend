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

const testCourseExpirationLogic = async () => {
  try {
    await connectDB();
    
    const { canAssignDiscenteToCourse, markDiscenteCourseCompleted } = require('./courseExpirationService');
    const Discente = require('../models/Discente');
    const Course = require('../models/Course');
    const Kit = require('../models/Kit');
    
    console.log('🔍 Testing Course Expiration Logic...\n');

    // Find a sample discente and kit type
    const sampleDiscente = await Discente.findOne();
    const sampleKit = await Kit.findOne();
    
    if (!sampleDiscente || !sampleKit) {
      console.log('❌ No sample data found. Please ensure you have discentes and kits in the database.');
      return;
    }

    console.log(`📋 Testing with:`);
    console.log(`   Discente: ${sampleDiscente.nome} ${sampleDiscente.cognome}`);
    console.log(`   Kit Type: ${sampleKit.type}`);
    console.log(`   Current Kit Assignments: ${sampleDiscente.kitAssignments.length}\n`);

    // Test 1: Check if discente can be assigned to a new course
    console.log('📝 Test 1: Checking initial assignment eligibility...');
    const initialCheck = await canAssignDiscenteToCourse(sampleDiscente._id.toString(), sampleKit._id.toString());
    console.log(`   Result: ${initialCheck.canAssign ? '✅ CAN ASSIGN' : '❌ CANNOT ASSIGN'}`);
    console.log(`   Reason: ${initialCheck.reason}`);
    if (initialCheck.expirationDate) {
      console.log(`   Expires: ${initialCheck.expirationDate}`);
    }
    console.log('');

    // Show current assignments
    if (sampleDiscente.kitAssignments.length > 0) {
      console.log('📂 Current Kit Assignments:');
      sampleDiscente.kitAssignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. Course: ${assignment.courseName || 'Unknown'}`);
        console.log(`      Kit Type: ${assignment.kitType}`);
        console.log(`      Assigned: ${assignment.assignedDate}`);
        console.log(`      Completed: ${assignment.courseCompletedDate || 'Not completed'}`);
        console.log(`      Expires: ${assignment.expirationDate || 'No expiration set'}`);
        console.log('');
      });
    }

    console.log('✅ Course expiration logic test completed!\n');
    
  } catch (error) {
    console.error('❌ Error testing course expiration logic:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
};

// Run the test
testCourseExpirationLogic();
