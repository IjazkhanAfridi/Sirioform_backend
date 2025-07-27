const mongoose = require('mongoose');
const Discente = require('../models/Discente');
const Course = require('../models/Course');
const Order = require('../models/Order');
require('dotenv').config();

const migrateKitAssignments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all discenti with patentNumbers but no kitAssignments
    const discenti = await Discente.find({
      patentNumber: { $exists: true, $ne: [] },
      $or: [
        { kitAssignments: { $exists: false } },
        { kitAssignments: { $size: 0 } },
      ],
    });

    console.log(`Found ${discenti.length} discenti to migrate`);

    let migratedCount = 0;
    let assignmentCount = 0;

    for (const discente of discenti) {
      console.log(`\nMigrating discente: ${discente.nome} ${discente.cognome}`);

      // Find courses where this discente is enrolled
      const courses = await Course.find({
        discente: discente._id,
      })
        .populate('tipologia')
        .populate('userId');

      console.log(`  Found ${courses.length} courses for this discente`);

      const newKitAssignments = [];

      for (const patentNumber of discente.patentNumber) {
        console.log(`  Processing patent number: ${patentNumber}`);

        // Find the order containing this patent number
        const order = await Order.findOne({
          'orderItems.progressiveNumbers': patentNumber,
        }).populate('orderItems.productId');

        if (order) {
          const kitItem = order.orderItems.find((item) =>
            item.progressiveNumbers.includes(patentNumber)
          );

          if (kitItem) {
            console.log(`    Found kit type: ${kitItem.productId.type}`);

            // Try to match with a course of the same kit type
            const matchingCourse = courses.find(
              (course) =>
                course.tipologia._id.toString() ===
                kitItem.productId._id.toString()
            );

            if (matchingCourse) {
              console.log(
                `    Matched with course: ${matchingCourse.tipologia.type}`
              );

              const center = matchingCourse.userId;
              const centerName =
                center.role === 'center'
                  ? center.name
                  : `${center.firstName} ${center.lastName}`;

              const newKitAssignment = {
                kitNumber: patentNumber,
                courseId: matchingCourse._id,
                courseName: matchingCourse.tipologia?.type || 'Unknown Course',
                courseType: matchingCourse.tipologia?.type || 'Unknown Type',
                instructorId: null,
                instructorName: '',
                centerId: center._id,
                centerName: centerName,
                assignedDate: matchingCourse.createdAt || new Date(),
                kitType: kitItem.productId.type,
              };

              newKitAssignments.push(newKitAssignment);
              assignmentCount++;
              console.log(
                `    Created kit assignment for course: ${matchingCourse.progressiveNumber}`
              );
            } else {
              console.log(
                `    No matching course found for kit type: ${kitItem.productId.type}`
              );

              // Create a generic assignment without course association
              const newKitAssignment = {
                kitNumber: patentNumber,
                courseId: null,
                courseName: 'Legacy Assignment',
                courseType: kitItem.productId.type,
                instructorId: null,
                instructorName: '',
                centerId: null,
                centerName: 'Unknown',
                assignedDate: discente.createdAt || new Date(),
                kitType: kitItem.productId.type,
              };

              newKitAssignments.push(newKitAssignment);
              assignmentCount++;
              console.log(`    Created legacy kit assignment`);
            }
          } else {
            console.log(
              `    Kit item not found in order for patent number: ${patentNumber}`
            );
          }
        } else {
          console.log(`    Order not found for patent number: ${patentNumber}`);
        }
      }

      if (newKitAssignments.length > 0) {
        // Initialize kitAssignments array if it doesn't exist
        if (!discente.kitAssignments) {
          discente.kitAssignments = [];
        }

        discente.kitAssignments.push(...newKitAssignments);
        await discente.save();
        migratedCount++;
        console.log(
          `  Successfully migrated ${newKitAssignments.length} kit assignments`
        );
      } else {
        console.log(`  No kit assignments created for this discente`);
      }
    }

    console.log(`\nMigration completed:`);
    console.log(`- Total discenti migrated: ${migratedCount}`);
    console.log(`- Total kit assignments created: ${assignmentCount}`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the migration
if (require.main === module) {
  migrateKitAssignments();
}

module.exports = migrateKitAssignments;
