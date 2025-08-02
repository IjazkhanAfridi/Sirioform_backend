const mongoose = require('mongoose');
const { canAssignDiscenteToCourse, canAssignInstructorToKitType, markDiscenteCourseCompleted, markInstructorCourseCompleted } = require('./utils/courseExpirationService');
const Discente = require('./models/Discente');
const User = require('./models/User');
const Course = require('./models/Course');
require('dotenv').config();

const testExpirationFunctionality = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for expiration testing');

    console.log('\n=== Testing Course Expiration Functionality ===');

    // Test 1: Find a discente with kit assignments
    console.log('\n1. Testing Discente Eligibility Checking...');
    const sampleDiscente = await Discente.findOne({ kitAssignments: { $ne: [] } }).populate('kitAssignments.courseId');
    
    if (sampleDiscente) {
      console.log(`Found discente: ${sampleDiscente.nome} ${sampleDiscente.cognome}`);
      console.log(`Kit assignments: ${sampleDiscente.kitAssignments.length}`);
      
      // Test eligibility for the same kit type
      if (sampleDiscente.kitAssignments.length > 0) {
        const firstAssignment = sampleDiscente.kitAssignments[0];
        console.log(`Testing with kit assignment: ${firstAssignment.kitType}`);
        
        // Simulate a completed course by setting completion date
        if (!firstAssignment.courseCompletedDate) {
          firstAssignment.courseCompletedDate = new Date();
          firstAssignment.expirationDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years from now
          await sampleDiscente.save();
          console.log('Marked course as completed for testing');
        }
        
        // Find a course with the same kit type to test against
        const testCourse = await Course.findOne({ tipologia: firstAssignment.courseId?.tipologia }).populate('tipologia');
        if (testCourse) {
          const eligibility = await canAssignDiscenteToCourse(sampleDiscente._id.toString(), testCourse.tipologia._id.toString());
          console.log('Eligibility result:', eligibility);
        } else {
          console.log('No course found with matching kit type for testing');
        }
      }
    } else {
      console.log('No discente found with kit assignments');
    }

    // Test 2: Find an instructor and test eligibility
    console.log('\n2. Testing Instructor Eligibility Checking...');
    const sampleInstructor = await User.findOne({ role: 'instructor' });
    
    if (sampleInstructor) {
      console.log(`Found instructor: ${sampleInstructor.firstName} ${sampleInstructor.lastName}`);
      
      // Find a kit type to test with
      const Kit = require('./models/Kit');
      const sampleKit = await Kit.findOne();
      
      if (sampleKit) {
        console.log(`Testing with kit type: ${sampleKit.type}`);
        const eligibility = await canAssignInstructorToKitType(sampleInstructor._id.toString(), sampleKit._id.toString());
        console.log('Instructor eligibility result:', eligibility);
      } else {
        console.log('No kit types found for testing');
      }
    } else {
      console.log('No instructor found for testing');
    }

    // Test 3: Test course completion marking
    console.log('\n3. Testing Course Completion Marking...');
    if (sampleDiscente && sampleDiscente.kitAssignments.length > 0) {
      const assignment = sampleDiscente.kitAssignments[0];
      if (assignment.courseId) {
        const result = await markDiscenteCourseCompleted(sampleDiscente._id.toString(), assignment.courseId.toString());
        console.log('Discente course completion result:', result);
      }
    }

    if (sampleInstructor) {
      const sampleCourse = await Course.findOne({ istruttore: sampleInstructor._id });
      if (sampleCourse) {
        const result = await markInstructorCourseCompleted(sampleInstructor._id.toString(), sampleCourse._id.toString());
        console.log('Instructor course completion result:', result);
      } else {
        console.log('No course found for instructor testing');
      }
    }

    console.log('\n=== Expiration Testing Complete ===');

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the test
if (require.main === module) {
  testExpirationFunctionality();
}

module.exports = testExpirationFunctionality;
