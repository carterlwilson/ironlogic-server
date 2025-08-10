import express, { RequestHandler } from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import { Gym } from '../mongooseSchemas/Gym';
import { User } from '../mongooseSchemas/User';
import { GymMembership } from '../mongooseSchemas/GymMembership';
import { Location } from '../mongooseSchemas/Location';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// All admin routes require JWT authentication and system admin role
router.use(passport.authenticate('jwt', { session: false }));
router.use(isAdmin as any);

// GET /api/admin/gyms - Get all gyms with owner info and counts
const getAllGyms: RequestHandler = async (req, res) => {
  try {
    const gyms = await Gym.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $lookup: {
          from: 'gymmemberships',
          let: { gymId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$gymId', '$$gymId'] },
                    { $eq: ['$role', 'owner'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'ownerUser'
              }
            },
            {
              $unwind: {
                path: '$ownerUser',
                preserveNullAndEmptyArrays: true
              }
            }
          ],
          as: 'ownerMembership'
        }
      },
      {
        $lookup: {
          from: 'locations',
          let: { gymId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$gymId', '$$gymId'] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            }
          ],
          as: 'locations'
        }
      },
      {
        $lookup: {
          from: 'gymmemberships',
          let: { gymId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$gymId', '$$gymId'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            }
          ],
          as: 'members'
        }
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          address: 1,
          phone: 1,
          email: 1,
          createdAt: 1,
          owner: {
            $cond: {
              if: { $gt: [{ $size: '$ownerMembership' }, 0] },
              then: {
                id: { $toString: { $arrayElemAt: ['$ownerMembership.ownerUser._id', 0] } },
                name: { $arrayElemAt: ['$ownerMembership.ownerUser.name', 0] },
                email: { $arrayElemAt: ['$ownerMembership.ownerUser.email', 0] }
              },
              else: null
            }
          },
          locationCount: { $size: '$locations' },
          memberCount: { $size: '$members' },
          _id: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json({
      success: true,
      data: gyms
    });
  } catch (error) {
    console.error('Error fetching gyms:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET /api/admin/gyms/:gymId/details - Get detailed gym info
const getGymDetails: RequestHandler = async (req, res) => {
  try {
    const { gymId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(gymId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid gym ID'
      });
      return;
    }

    const gymDetails = await Gym.aggregate([
      {
        $match: { 
          _id: new mongoose.Types.ObjectId(gymId),
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'gymmemberships',
          let: { gymId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$gymId', '$$gymId'] },
                    { $eq: ['$role', 'owner'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'ownerUser'
              }
            },
            {
              $unwind: {
                path: '$ownerUser',
                preserveNullAndEmptyArrays: true
              }
            }
          ],
          as: 'ownerMembership'
        }
      },
      {
        $lookup: {
          from: 'locations',
          let: { gymId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$gymId', '$$gymId'] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            },
            {
              $project: {
                id: { $toString: '$_id' },
                name: 1,
                address: 1,
                _id: 0
              }
            }
          ],
          as: 'locations'
        }
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          address: 1,
          phone: 1,
          email: 1,
          description: 1,
          createdAt: 1,
          owner: {
            $cond: {
              if: { $gt: [{ $size: '$ownerMembership' }, 0] },
              then: {
                id: { $toString: { $arrayElemAt: ['$ownerMembership.ownerUser._id', 0] } },
                name: { $arrayElemAt: ['$ownerMembership.ownerUser.name', 0] },
                email: { $arrayElemAt: ['$ownerMembership.ownerUser.email', 0] }
              },
              else: null
            }
          },
          locations: 1,
          _id: 0
        }
      }
    ]);

    if (!gymDetails.length) {
      res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
      return;
    }

    res.json({
      success: true,
      data: gymDetails[0]
    });
  } catch (error) {
    console.error('Error fetching gym details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET /api/admin/users/owners - Get all users with owner role
const getOwnerUsers: RequestHandler = async (req, res) => {
  try {
    // Get all users who have owner role in any gym
    const ownerUsers = await GymMembership.aggregate([
      {
        $match: {
          role: 'owner',
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $group: {
          _id: '$userId',
          name: { $first: '$user.name' },
          email: { $first: '$user.email' },
          assignedGymId: { $first: '$gymId' } // Get the first gym they own
        }
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          email: 1,
          assignedGymId: 1,
          _id: 0
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    res.json({
      success: true,
      data: ownerUsers
    });
  } catch (error) {
    console.error('Error fetching owner users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET /api/admin/users - Get all users with search, sort, and pagination
const getAllUsers: RequestHandler = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      gymId,
      isActive
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    const searchQuery: any = {};
    
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      searchQuery.role = role;
    }
    
    if (isActive !== undefined) {
      searchQuery.isActive = isActive === 'true';
    }

    // Build sort object
    const sortObj: any = {};
    if (sortBy === 'gymName') {
      // Special handling for gym name sorting - will be done in aggregation
    } else {
      sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    }

    const users = await User.aggregate([
      { $match: searchQuery },
      {
        $lookup: {
          from: 'gymmemberships',
          let: { userId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'gyms',
                let: { gymId: '$gymId' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: [{ $toString: '$_id' }, '$$gymId'] }
                    }
                  }
                ],
                as: 'gym'
              }
            },
            {
              $unwind: {
                path: '$gym',
                preserveNullAndEmptyArrays: true
              }
            }
          ],
          as: 'memberships'
        }
      },
      {
        $addFields: {
          gymMembership: {
            $cond: {
              if: { $gt: [{ $size: '$memberships' }, 0] },
              then: {
                gymId: { $arrayElemAt: ['$memberships.gymId', 0] },
                gymName: { $arrayElemAt: ['$memberships.gym.name', 0] },
                role: { $arrayElemAt: ['$memberships.role', 0] },
                status: { $arrayElemAt: ['$memberships.status', 0] },
                joinedAt: { $arrayElemAt: ['$memberships.createdAt', 0] }
              },
              else: null
            }
          }
        }
      },
      // Apply gym filter if specified
      ...(gymId ? [{ $match: { 'gymMembership.gymId': gymId } }] : []),
      {
        $project: {
          id: { $toString: '$_id' },
          email: 1,
          name: 1,
          role: 1,
          isActive: 1,
          gymMembership: 1,
          createdAt: 1,
          updatedAt: 1,
          _id: 0
        }
      },
      // Sort
      ...(sortBy === 'gymName' 
        ? [{ $sort: { 'gymMembership.gymName': sortOrder === 'asc' ? 1 : -1 } }]
        : [{ $sort: sortObj }]
      ),
      // Count total for pagination
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'count' }]
        }
      }
    ]);

    const result = users[0];
    const totalCount = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: result.data,
      count: result.data.length,
      totalPages,
      currentPage: pageNum,
      totalCount
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST /api/admin/users - Create new user
const createUser: RequestHandler = async (req, res) => {
  try {
    const { email, name, password, role, gymMembership } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Create user (password will be hashed by User schema pre-save hook)
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      password,
      role,
      isActive: true
    });

    // Create gym membership if specified
    let membershipData = null;
    if (gymMembership) {
      const membership = await GymMembership.create({
        userId: (user._id as any).toString(),
        gymId: gymMembership.gymId,
        role: gymMembership.role,
        status: gymMembership.status || 'active'
      });

      const gym = await Gym.findById(gymMembership.gymId);
      membershipData = {
        gymId: gymMembership.gymId,
        gymName: gym?.name || '',
        role: gymMembership.role,
        status: membership.status,
        joinedAt: (membership as any).createdAt?.toISOString() || new Date().toISOString()
      };
    }

    const userResponse = {
      id: (user._id as any).toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      gymMembership: membershipData,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
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

// PUT /api/admin/users/:userId - Update user
const updateUser: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, name, role, isActive, gymMembership } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Update user fields
    if (email) user.email = email.toLowerCase();
    if (name) user.name = name;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Handle gym membership update
    let membershipData = null;
    
    // Remove existing membership
    await GymMembership.deleteMany({ userId: (user._id as any).toString() });
    
    // Add new membership if specified
    if (gymMembership) {
      const membership = await GymMembership.create({
        userId: (user._id as any).toString(),
        gymId: gymMembership.gymId,
        role: gymMembership.role,
        status: gymMembership.status || 'active'
      });

      const gym = await Gym.findById(gymMembership.gymId);
      membershipData = {
        gymId: gymMembership.gymId,
        gymName: gym?.name || '',
        role: gymMembership.role,
        status: membership.status,
        joinedAt: (membership as any).createdAt?.toISOString() || new Date().toISOString()
      };
    }

    const userResponse = {
      id: (user._id as any).toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      gymMembership: membershipData,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
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

// DELETE /api/admin/users/:userId - Delete user
const deleteUser: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Remove gym memberships
    await GymMembership.deleteMany({ userId: (user._id as any).toString() });
    
    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET /api/admin/users/:userId - Get single user with complete details
const getUserById: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Get gym membership separately
    const membership = await GymMembership.findOne({ 
      userId: (user._id as any).toString(),
      status: 'active'
    });

    let membershipData = null;
    if (membership) {
      const gym = await Gym.findById(membership.gymId);
      membershipData = {
        gymId: membership.gymId,
        gymName: gym?.name || '',
        role: membership.role,
        status: membership.status,
        joinedAt: (membership as any).createdAt?.toISOString() || new Date().toISOString()
      };
    }

    const userResponse = {
      id: (user._id as any).toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      gymMembership: membershipData,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/gyms', getAllGyms);
router.get('/gyms/:gymId/details', getGymDetails);
router.get('/users/owners', getOwnerUsers);
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.post('/users', createUser);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

export default router;