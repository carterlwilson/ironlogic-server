import express, { RequestHandler } from 'express';
import passport from 'passport';
import { Program } from '../mongooseSchemas/Program';
import { IProgram } from '../models/Program';
import { ActivityGroup } from '../mongooseSchemas/ActivityGroup';
import { addGymContext, requireGymAccess, requireGymOwner, requireGymTrainer } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// Helper function to populate group names in programs
const populateGroupNames = async (programs: any[]) => {
  // Collect all unique group IDs from all programs
  const groupIds = new Set<string>();
  
  programs.forEach(program => {
    if (program.blocks) {
      program.blocks.forEach((block: any) => {
        if (block.groupTargetPercentages) {
          block.groupTargetPercentages.forEach((gtp: any) => {
            if (gtp.groupId) groupIds.add(gtp.groupId);
          });
        }
        if (block.weeks) {
          block.weeks.forEach((week: any) => {
            if (week.groupTargetPercentages) {
              week.groupTargetPercentages.forEach((gtp: any) => {
                if (gtp.groupId) groupIds.add(gtp.groupId);
              });
            }
          });
        }
      });
    }
  });

  // Fetch activity groups if we have any group IDs
  if (groupIds.size === 0) return programs;
  
  const activityGroups = await ActivityGroup.find({ 
    _id: { $in: Array.from(groupIds) } 
  }).select('name');
  
  const groupNameMap = new Map(
    activityGroups.map(group => [group.id, group.name])
  );

  // Transform programs to include group names
  return programs.map(program => {
    if (!program.blocks) return program;
    
    const programObj = program.toObject ? program.toObject() : program;
    
    programObj.blocks = programObj.blocks.map((block: any) => {
      // Populate block-level group target percentages
      if (block.groupTargetPercentages) {
        block.groupTargetPercentages = block.groupTargetPercentages.map((gtp: any) => ({
          ...gtp,
          groupName: groupNameMap.get(gtp.groupId) || undefined
        }));
      }
      
      // Populate week-level group target percentages
      if (block.weeks) {
        block.weeks = block.weeks.map((week: any) => {
          if (week.groupTargetPercentages) {
            week.groupTargetPercentages = week.groupTargetPercentages.map((gtp: any) => ({
              ...gtp,
              groupName: groupNameMap.get(gtp.groupId) || undefined
            }));
          }
          return week;
        });
      }
      
      return block;
    });
    
    return programObj;
  });
};

// GET all programs for a gym
const getAllPrograms: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const programs = await Program.find({ gymId }).select('-__v');
    const populatedPrograms = await populateGroupNames(programs);
    
    res.json({
      success: true,
      count: populatedPrograms.length,
      data: populatedPrograms
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET program templates for a gym
const getProgramTemplates: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const templates = await Program.find({ 
      gymId, 
      isTemplate: true 
    }).select('-__v');
    const populatedTemplates = await populateGroupNames(templates);
    
    res.json({
      success: true,
      count: populatedTemplates.length,
      data: populatedTemplates
    });
  } catch (error) {
    console.error('Error fetching program templates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single program by ID
const getProgramById: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const program = await Program.findOne({ 
      _id: req.params.id, 
      gymId 
    }).select('-__v');
    
    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }
    
    const [populatedProgram] = await populateGroupNames([program]);
    
    res.json({
      success: true,
      data: populatedProgram
    });
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new program (template or assigned)
const createProgram: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const { name, blocks, isTemplate = false, clientId } = req.body;
    const createdBy = (req as any).user?.id;
    
    const program = await Program.create({
      name,
      blocks,
      gymId,
      isTemplate,
      clientId,
      createdBy
    });
    
    res.status(201).json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Error creating program:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      const messages = Object.values((error as any).errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST assign template to client
const assignTemplateToClient: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const { templateId, clientId } = req.params;
    const createdBy = (req as any).user?.id;
    
    // Get the template
    const template = await Program.findOne({ 
      _id: templateId, 
      gymId, 
      isTemplate: true 
    });
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Program template not found'
      });
      return;
    }
    
    // Create assigned program from template
    const assignedProgram = await Program.create({
      name: `${template.name} - Client Program`,
      blocks: template.blocks,
      gymId,
      isTemplate: false,
      templateId: template.id,
      clientId,
      createdBy
    });
    
    res.status(201).json({
      success: true,
      data: assignedProgram
    });
  } catch (error) {
    console.error('Error assigning template to client:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PUT update program
const updateProgram: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const { name, blocks, isTemplate, clientId } = req.body;
    
    const program = await Program.findOneAndUpdate(
      { _id: req.params.id, gymId },
      { name, blocks, isTemplate, clientId },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }
    
    // If this is a template being updated, auto-update all assigned programs
    if (program.isTemplate) {
      try {
        await Program.updateMany(
          { templateId: program.id, gymId },
          { $set: { blocks: program.blocks } }
        );
        console.log(`Auto-updated assigned programs for template ${program.id}`);
      } catch (updateError) {
        console.error('Error auto-updating assigned programs:', updateError);
        // Continue with the response even if auto-update fails
      }
    }
    
    const [populatedProgram] = await populateGroupNames([program]);
    
    res.json({
      success: true,
      data: populatedProgram
    });
  } catch (error) {
    console.error('Error updating program:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      const messages = Object.values((error as any).errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE program
const deleteProgram: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const program = await Program.findOneAndDelete({ 
      _id: req.params.id, 
      gymId 
    });
    
    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }
    
    // If this is a template being deleted, we should handle assigned programs
    // For now, we'll just delete the template and leave assigned programs
    // TODO: Consider warning user about orphaned assigned programs
    
    res.json({
      success: true,
      message: 'Program deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions (all routes are gym-scoped via :gymId parameter)
// All routes require JWT authentication
router.get('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getAllPrograms);
router.get('/templates', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getProgramTemplates);
router.get('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getProgramById);
router.post('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, createProgram);
router.post('/:templateId/assign/:clientId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, assignTemplateToClient);
router.put('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, updateProgram);
router.delete('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, deleteProgram);

export default router;