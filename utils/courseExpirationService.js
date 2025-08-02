const Discente = require('../models/Discente');
const User = require('../models/User');
const Course = require('../models/Course');

/**
 * Check if a discente can be assigned to a course based on kit type and expiration rules
 * @param {string} discenteId - The ID of the discente
 * @param {string} kitTypeId - The kit type ID from the course
 * @returns {Object} - { canAssign: boolean, reason: string, expirationDate?: Date }
 */
const canAssignDiscenteToCourse = async (discenteId, kitTypeId) => {
  try {
    const discente = await Discente.findById(discenteId).populate({
      path: 'kitAssignments.courseId',
      populate: {
        path: 'tipologia',
        model: 'Kit'
      }
    });

    if (!discente) {
      return { canAssign: false, reason: 'Discente non trovato' };
    }

    // Get the kit type for comparison
    const Kit = require('../models/Kit');
    const kitType = await Kit.findById(kitTypeId);
    
    if (!kitType) {
      return { canAssign: false, reason: 'Tipo di kit non trovato' };
    }

    // Find all courses with the same kit type (regardless of whether they have kit numbers assigned)
    const coursesWithSameKit = discente.kitAssignments.filter(assignment => {
      // Check if this assignment is for the same kit type
      if (assignment.courseId && assignment.courseId.tipologia) {
        return assignment.courseId.tipologia._id.toString() === kitTypeId;
      }
      // Fallback: check by kit type string
      return assignment.kitType === kitType.type;
    });

    if (coursesWithSameKit.length === 0) {
      return { canAssign: true, reason: 'Nessun corso precedente con questo tipo di kit' };
    }

    // Check for active (non-completed) courses
    const activeCourse = coursesWithSameKit.find(assignment => {
      return !assignment.courseCompletedDate; // Course is not completed yet
    });

    if (activeCourse) {
      return {
        canAssign: false,
        reason: `Il discente è già assegnato a un corso attivo con questo tipo di kit. Deve completare il corso esistente prima di essere assegnato a uno nuovo.`,
        courseInfo: {
          courseName: activeCourse.courseName,
          assignedDate: activeCourse.assignedDate
        }
      };
    }

    // Check for completed courses still within expiration period
    const completedCoursesWithSameKit = coursesWithSameKit.filter(assignment => {
      return assignment.courseCompletedDate && assignment.expirationDate;
    });

    if (completedCoursesWithSameKit.length > 0) {
      const currentDate = new Date();
      const activeExpiration = completedCoursesWithSameKit.find(assignment => {
        return assignment.expirationDate > currentDate;
      });

      if (activeExpiration) {
        return {
          canAssign: false,
          reason: `Il discente ha già completato un corso con questo tipo di kit. Potrà essere assegnato nuovamente dopo la scadenza.`,
          expirationDate: activeExpiration.expirationDate,
          courseInfo: {
            courseName: activeExpiration.courseName,
            completedDate: activeExpiration.courseCompletedDate
          }
        };
      }
    }

    return { canAssign: true, reason: 'Tutti i corsi precedenti con questo tipo di kit sono scaduti' };

  } catch (error) {
    console.error('Error checking discente course assignment eligibility:', error);
    return { canAssign: false, reason: 'Errore durante la verifica dell\'idoneità' };
  }
};

/**
 * Check if an instructor can be assigned to a course based on kit type and expiration rules
 * @param {string} instructorId - The ID of the instructor
 * @param {string} kitTypeId - The kit type ID from the course
 * @returns {Object} - { canAssign: boolean, reason: string, expirationDate?: Date }
 */
const canAssignInstructorToCourse = async (instructorId, kitTypeId) => {
  try {
    const instructor = await User.findById(instructorId).populate({
      path: 'courseCompletions.courseId',
      populate: {
        path: 'tipologia',
        model: 'Kit'
      }
    });

    if (!instructor || instructor.role !== 'instructor') {
      return { canAssign: false, reason: 'Istruttore non trovato' };
    }

    // Find all completed courses with the same kit type
    const completedCoursesWithSameKit = instructor.courseCompletions.filter(completion => {
      return completion.courseId && 
             completion.courseId.tipologia && 
             completion.courseId.tipologia._id.toString() === kitTypeId &&
             completion.completedDate && // Course was completed
             completion.expirationDate; // Has expiration date
    });

    if (completedCoursesWithSameKit.length === 0) {
      return { canAssign: true, reason: 'Nessun corso precedente con questo tipo di kit' };
    }

    // Check if any of the completed courses are still within the 1-year expiration period
    const currentDate = new Date();
    const activeExpiration = completedCoursesWithSameKit.find(completion => {
      return completion.expirationDate > currentDate;
    });

    if (activeExpiration) {
      return {
        canAssign: false,
        reason: `L'istruttore ha già completato un corso con questo tipo di kit. Potrà essere assegnato nuovamente dopo la scadenza.`,
        expirationDate: activeExpiration.expirationDate,
        courseInfo: {
          courseName: activeExpiration.courseName,
          completedDate: activeExpiration.completedDate
        }
      };
    }

    return { canAssign: true, reason: 'Tutti i corsi precedenti con questo tipo di kit sono scaduti' };

  } catch (error) {
    console.error('Error checking instructor course assignment eligibility:', error);
    return { canAssign: false, reason: 'Errore durante la verifica dell\'idoneità' };
  }
};

/**
 * Check if an instructor can be assigned based on kit type only (for course creation)
 * @param {string} instructorId - The ID of the instructor
 * @param {string} kitTypeId - The kit type ID
 * @returns {Object} - { canAssign: boolean, reason: string, expirationDate?: Date }
 */
const canAssignInstructorToKitType = async (instructorId, kitTypeId) => {
  try {
    const instructor = await User.findById(instructorId);

    if (!instructor || instructor.role !== 'instructor') {
      return { canAssign: false, reason: 'Istruttore non trovato' };
    }

    // Find all completed courses with the same kit type
    const completedCoursesWithSameKit = instructor.courseCompletions.filter(completion => {
      return completion.kitType && 
             completion.completedDate && // Course was completed
             completion.expirationDate; // Has expiration date
    });

    // For this check, we need to compare against the kit type directly since we don't have a course yet
    // We'll need to get the kit type from the kit ID
    const Kit = require('../models/Kit');
    const kitType = await Kit.findById(kitTypeId);
    
    if (!kitType) {
      return { canAssign: false, reason: 'Tipo di kit non trovato' };
    }

    const relevantCompletions = completedCoursesWithSameKit.filter(completion => {
      return completion.kitType === kitType.type;
    });

    if (relevantCompletions.length === 0) {
      return { canAssign: true, reason: 'Nessun corso precedente con questo tipo di kit' };
    }

    // Check if any of the completed courses are still within the 1-year expiration period
    const currentDate = new Date();
    const activeExpiration = relevantCompletions.find(completion => {
      return completion.expirationDate > currentDate;
    });

    if (activeExpiration) {
      return {
        canAssign: false,
        reason: `L'istruttore ha già completato un corso con questo tipo di kit. Potrà essere assegnato nuovamente dopo la scadenza.`,
        expirationDate: activeExpiration.expirationDate,
        courseInfo: {
          courseName: activeExpiration.courseName,
          completedDate: activeExpiration.completedDate
        }
      };
    }

    return { canAssign: true, reason: 'Tutti i corsi precedenti con questo tipo di kit sono scaduti' };

  } catch (error) {
    console.error('Error checking instructor kit type assignment eligibility:', error);
    return { canAssign: false, reason: 'Errore durante la verifica dell\'idoneità' };
  }
};

/**
 * Mark a course as completed for a discente and set expiration date
 * @param {string} discenteId - The ID of the discente
 * @param {string} courseId - The ID of the completed course
 * @returns {Object} - { success: boolean, message: string }
 */
const markDiscenteCourseCompleted = async (discenteId, courseId) => {
  try {
    const discente = await Discente.findById(discenteId);
    if (!discente) {
      return { success: false, message: 'Discente non trovato' };
    }

    // Find the kit assignment for this course
    const kitAssignment = discente.kitAssignments.find(
      assignment => assignment.courseId.toString() === courseId
    );

    if (!kitAssignment) {
      return { success: false, message: 'Assegnazione kit non trovata per questo corso' };
    }

    // Set completion date and expiration date (2 years from completion)
    kitAssignment.courseCompletedDate = new Date();
    kitAssignment.expirationDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years

    await discente.save();

    return { 
      success: true, 
      message: 'Corso marcato come completato per il discente',
      expirationDate: kitAssignment.expirationDate
    };

  } catch (error) {
    console.error('Error marking discente course as completed:', error);
    return { success: false, message: 'Errore durante l\'aggiornamento' };
  }
};

/**
 * Mark a course as completed for an instructor and set expiration date
 * @param {string} instructorId - The ID of the instructor
 * @param {string} courseId - The ID of the completed course
 * @returns {Object} - { success: boolean, message: string }
 */
const markInstructorCourseCompleted = async (instructorId, courseId) => {
  try {
    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return { success: false, message: 'Istruttore non trovato' };
    }

    const course = await Course.findById(courseId).populate('tipologia');
    if (!course) {
      return { success: false, message: 'Corso non trovato' };
    }

    // Check if already marked as completed
    const existingCompletion = instructor.courseCompletions.find(
      completion => completion.courseId.toString() === courseId
    );

    if (existingCompletion) {
      // Update existing completion
      existingCompletion.completedDate = new Date();
      existingCompletion.expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    } else {
      // Create new completion record
      const newCompletion = {
        courseId: courseId,
        courseName: course.tipologia?.type || 'Unknown Course',
        courseType: course.tipologia?.type || 'Unknown Type',
        kitType: course.tipologia?.type || 'Unknown Kit Type',
        centerId: course.userId,
        centerName: '', // Will be populated if needed
        completedDate: new Date(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      };

      instructor.courseCompletions.push(newCompletion);
    }

    await instructor.save();

    return { 
      success: true, 
      message: 'Corso marcato come completato per l\'istruttore',
      expirationDate: instructor.courseCompletions[instructor.courseCompletions.length - 1].expirationDate
    };

  } catch (error) {
    console.error('Error marking instructor course as completed:', error);
    return { success: false, message: 'Errore durante l\'aggiornamento' };
  }
};

/**
 * Get all expired courses for a discente
 * @param {string} discenteId - The ID of the discente
 * @returns {Array} - Array of expired course assignments
 */
const getExpiredCoursesForDiscente = async (discenteId) => {
  try {
    const discente = await Discente.findById(discenteId).populate('kitAssignments.courseId');
    if (!discente) {
      return [];
    }

    const currentDate = new Date();
    return discente.kitAssignments.filter(assignment => {
      return assignment.expirationDate && assignment.expirationDate <= currentDate;
    });

  } catch (error) {
    console.error('Error getting expired courses for discente:', error);
    return [];
  }
};

/**
 * Get all expired courses for an instructor
 * @param {string} instructorId - The ID of the instructor
 * @returns {Array} - Array of expired course completions
 */
const getExpiredCoursesForInstructor = async (instructorId) => {
  try {
    const instructor = await User.findById(instructorId).populate('courseCompletions.courseId');
    if (!instructor || instructor.role !== 'instructor') {
      return [];
    }

    const currentDate = new Date();
    return instructor.courseCompletions.filter(completion => {
      return completion.expirationDate && completion.expirationDate <= currentDate;
    });

  } catch (error) {
    console.error('Error getting expired courses for instructor:', error);
    return [];
  }
};

module.exports = {
  canAssignDiscenteToCourse,
  canAssignInstructorToCourse,
  canAssignInstructorToKitType,
  markDiscenteCourseCompleted,
  markInstructorCourseCompleted,
  getExpiredCoursesForDiscente,
  getExpiredCoursesForInstructor
};
