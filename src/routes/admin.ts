import express, { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { Gym } from '../mongooseSchemas/Gym';
import { User } from '../mongooseSchemas/User';
import { GymMembership } from '../mongooseSchemas/GymMembership';
import { Location } from '../mongooseSchemas/Location';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// All admin routes require system admin role
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

// Route definitions
router.get('/gyms', getAllGyms);
router.get('/gyms/:gymId/details', getGymDetails);
router.get('/users/owners', getOwnerUsers);

export default router;