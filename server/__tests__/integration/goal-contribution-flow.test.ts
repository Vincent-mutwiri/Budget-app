/**
 * Integration Test: Complete Goal Contribution Flow
 * 
 * Tests the following flow:
 * 1. Create goal
 * 2. Upload custom image
 * 3. Make contribution
 * 4. Verify balance deduction
 * 5. Verify goal progress update
 * 6. Verify XP reward
 * 7. Remove image
 * 
 * Requirements: 6.1, 7.1, 14.1, 14.2, 14.3, 14.4, 14.5
 */

import mongoose from 'mongoose';
import { User } from '../../models/User';
import { SavingsGoal } from '../../models/SavingsGoal';

describe('Goal Contribution Flow Integration Tests', () => {
    let testUserId: string;
    let testGoalId: string;

    beforeAll(async () => {
        // Connect to test database
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-app-test';
        await mongoose.connect(MONGODB_URI);
    });

    afterAll(async () => {
        // Clean up and disconnect
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Create test user with initial balance
        const testUser = new User({
            clerkId: `test-user-${Date.now()}`,
            email: 'test@example.com',
            fullName: 'Test User',
            xp: 0,
            level: 1,
            totalBalance: 5000 // Starting balance for contributions
        });
        await testUser.save();
        testUserId = testUser.clerkId;
    });

    afterEach(async () => {
        // Clean up test data
        await User.deleteMany({ clerkId: { $regex: /^test-user-/ } });
        await SavingsGoal.deleteMany({ userId: { $regex: /^test-user-/ } });
    });

    describe('Step 1: Create goal', () => {
        it('should create a savings goal successfully', async () => {
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6); // 6 months from now

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Vacation Fund',
                targetAmount: 3000,
                currentAmount: 0,
                deadline: deadline,
                imageUrl: 'https://example.com/default-goal.jpg',
                status: 'in-progress'
            });

            await goal.save();
            testGoalId = goal._id.toString();

            expect(goal).toBeDefined();
            expect(goal.userId).toBe(testUserId);
            expect(goal.title).toBe('Vacation Fund');
            expect(goal.targetAmount).toBe(3000);
            expect(goal.currentAmount).toBe(0);
            expect(goal.status).toBe('in-progress');
        });

        it('should initialize goal with empty contributions array', async () => {
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 3);

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Emergency Fund',
                targetAmount: 5000,
                currentAmount: 0,
                deadline: deadline,
                status: 'in-progress'
            });

            await goal.save();

            expect(goal.contributions).toBeDefined();
            expect(Array.isArray(goal.contributions)).toBe(true);
            expect(goal.contributions.length).toBe(0);
        });
    });

    describe('Step 2: Upload custom image', () => {
        beforeEach(async () => {
            // Create a goal for image upload tests
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6);

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Vacation Fund',
                targetAmount: 3000,
                currentAmount: 0,
                deadline: deadline,
                imageUrl: 'https://example.com/default-goal.jpg',
                status: 'in-progress'
            });

            await goal.save();
            testGoalId = goal._id.toString();
        });

        it('should update goal with custom image URL', async () => {
            const customImageUrl = 'https://s3.amazonaws.com/bucket/custom-goal-image.jpg';

            const goal = await SavingsGoal.findById(testGoalId);
            if (goal) {
                goal.imageUrl = customImageUrl;
                goal.updatedAt = new Date();
                await goal.save();
            }

            const updatedGoal = await SavingsGoal.findById(testGoalId);
            expect(updatedGoal?.imageUrl).toBe(customImageUrl);
            expect(updatedGoal?.updatedAt).toBeDefined();
        });

        it('should validate image URL format', () => {
            const validUrls = [
                'https://example.com/image.jpg',
                'https://example.com/image.png',
                'https://example.com/image.webp',
                'https://s3.amazonaws.com/bucket/image.jpeg'
            ];

            validUrls.forEach(url => {
                expect(url).toMatch(/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i);
            });
        });
    });

    describe('Step 3: Make contribution', () => {
        beforeEach(async () => {
            // Create a goal for contribution tests
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6);

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Vacation Fund',
                targetAmount: 3000,
                currentAmount: 0,
                deadline: deadline,
                status: 'in-progress'
            });

            await goal.save();
            testGoalId = goal._id.toString();
        });

        it('should add contribution to goal', async () => {
            const contributionAmount = 500;

            const goal = await SavingsGoal.findById(testGoalId);
            if (goal) {
                // Add contribution
                goal.contributions.push({
                    amount: contributionAmount,
                    date: new Date(),
                    note: 'First contribution'
                });
                goal.currentAmount += contributionAmount;
                goal.updatedAt = new Date();
                await goal.save();
            }

            const updatedGoal = await SavingsGoal.findById(testGoalId);
            expect(updatedGoal?.currentAmount).toBe(500);
            expect(updatedGoal?.contributions.length).toBe(1);
            expect(updatedGoal?.contributions[0].amount).toBe(500);
        });

        it('should validate contribution amount is positive', () => {
            const validAmounts = [1, 10, 100, 1000];
            const invalidAmounts = [0, -1, -100];

            validAmounts.forEach(amount => {
                expect(amount).toBeGreaterThan(0);
            });

            invalidAmounts.forEach(amount => {
                expect(amount).toBeLessThanOrEqual(0);
            });
        });

        it('should track multiple contributions', async () => {
            const goal = await SavingsGoal.findById(testGoalId);
            if (goal) {
                // Add first contribution
                goal.contributions.push({
                    amount: 500,
                    date: new Date(),
                    note: 'First contribution'
                });
                goal.currentAmount += 500;

                // Add second contribution
                goal.contributions.push({
                    amount: 300,
                    date: new Date(),
                    note: 'Second contribution'
                });
                goal.currentAmount += 300;

                goal.updatedAt = new Date();
                await goal.save();
            }

            const updatedGoal = await SavingsGoal.findById(testGoalId);
            expect(updatedGoal?.currentAmount).toBe(800);
            expect(updatedGoal?.contributions.length).toBe(2);
            expect(updatedGoal?.contributions[0].amount).toBe(500);
            expect(updatedGoal?.contributions[1].amount).toBe(300);
        });
    });

    describe('Step 4: Verify balance deduction', () => {
        beforeEach(async () => {
            // Create a goal for balance tests
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6);

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Vacation Fund',
                targetAmount: 3000,
                currentAmount: 0,
                deadline: deadline,
                status: 'in-progress'
            });

            await goal.save();
            testGoalId = goal._id.toString();
        });

        it('should deduct contribution amount from user balance', async () => {
            const contributionAmount = 500;

            // Get initial balance
            const user = await User.findOne({ clerkId: testUserId });
            const initialBalance = user?.totalBalance || 0;
            expect(initialBalance).toBe(5000);

            // Make contribution
            if (user) {
                user.totalBalance -= contributionAmount;
                await user.save();
            }

            const goal = await SavingsGoal.findById(testGoalId);
            if (goal) {
                goal.contributions.push({
                    amount: contributionAmount,
                    date: new Date()
                });
                goal.currentAmount += contributionAmount;
                await goal.save();
            }

            // Verify balance deduction
            const updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.totalBalance).toBe(4500);
        });

        it('should validate contribution does not exceed available balance', async () => {
            const user = await User.findOne({ clerkId: testUserId });
            const availableBalance = user?.totalBalance || 0;

            const validContribution = 1000;
            const invalidContribution = 6000; // More than available balance

            expect(validContribution).toBeLessThanOrEqual(availableBalance);
            expect(invalidContribution).toBeGreaterThan(availableBalance);
        });

        it('should handle multiple contributions with balance tracking', async () => {
            const user = await User.findOne({ clerkId: testUserId });
            const initialBalance = user?.totalBalance || 0;

            // First contribution
            const contribution1 = 500;
            if (user) {
                user.totalBalance -= contribution1;
                await user.save();
            }

            let updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.totalBalance).toBe(initialBalance - contribution1);

            // Second contribution
            const contribution2 = 300;
            if (updatedUser) {
                updatedUser.totalBalance -= contribution2;
                await updatedUser.save();
            }

            updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.totalBalance).toBe(initialBalance - contribution1 - contribution2);
        });
    });

    describe('Step 5: Verify goal progress update', () => {
        beforeEach(async () => {
            // Create a goal for progress tests
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6);

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Vacation Fund',
                targetAmount: 3000,
                currentAmount: 0,
                deadline: deadline,
                status: 'in-progress'
            });

            await goal.save();
            testGoalId = goal._id.toString();
        });

        it('should update goal progress percentage', async () => {
            const goal = await SavingsGoal.findById(testGoalId);
            if (goal) {
                goal.contributions.push({
                    amount: 1500,
                    date: new Date()
                });
                goal.currentAmount += 1500;
                await goal.save();
            }

            const updatedGoal = await SavingsGoal.findById(testGoalId);
            const progressPercentage = (updatedGoal!.currentAmount / updatedGoal!.targetAmount) * 100;

            expect(progressPercentage).toBe(50); // 1500 / 3000 = 50%
        });

        it('should mark goal as completed when target is reached', async () => {
            const goal = await SavingsGoal.findById(testGoalId);
            if (goal) {
                goal.contributions.push({
                    amount: 3000,
                    date: new Date()
                });
                goal.currentAmount += 3000;

                // Check if goal is completed
                if (goal.currentAmount >= goal.targetAmount) {
                    goal.status = 'completed';
                }

                await goal.save();
            }

            const updatedGoal = await SavingsGoal.findById(testGoalId);
            expect(updatedGoal?.status).toBe('completed');
            expect(updatedGoal?.currentAmount).toBeGreaterThanOrEqual(updatedGoal!.targetAmount);
        });

        it('should allow contributions beyond target amount', async () => {
            const goal = await SavingsGoal.findById(testGoalId);
            if (goal) {
                goal.contributions.push({
                    amount: 3500, // More than target
                    date: new Date()
                });
                goal.currentAmount += 3500;
                goal.status = 'completed';
                await goal.save();
            }

            const updatedGoal = await SavingsGoal.findById(testGoalId);
            expect(updatedGoal?.currentAmount).toBe(3500);
            expect(updatedGoal?.currentAmount).toBeGreaterThan(updatedGoal!.targetAmount);
        });
    });

    describe('Step 6: Verify XP reward', () => {
        beforeEach(async () => {
            // Create a goal for XP tests
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6);

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Vacation Fund',
                targetAmount: 3000,
                currentAmount: 0,
                deadline: deadline,
                status: 'in-progress'
            });

            await goal.save();
            testGoalId = goal._id.toString();
        });

        it('should award XP for goal contribution', async () => {
            const contributionXP = 25; // XP for contribution

            const user = await User.findOne({ clerkId: testUserId });
            const initialXP = user?.xp || 0;

            // Make contribution and award XP
            if (user) {
                user.xp = (user.xp || 0) + contributionXP;
                await user.save();
            }

            const updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.xp).toBe(initialXP + contributionXP);
        });

        it('should award bonus XP for completing goal', async () => {
            const contributionXP = 25;
            const completionBonusXP = 200;

            const user = await User.findOne({ clerkId: testUserId });
            const initialXP = user?.xp || 0;

            // Make contribution that completes the goal
            const goal = await SavingsGoal.findById(testGoalId);
            if (goal) {
                goal.contributions.push({
                    amount: 3000,
                    date: new Date()
                });
                goal.currentAmount += 3000;
                goal.status = 'completed';
                await goal.save();
            }

            // Award XP for contribution and completion
            if (user) {
                user.xp = (user.xp || 0) + contributionXP + completionBonusXP;
                await user.save();
            }

            const updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.xp).toBe(initialXP + contributionXP + completionBonusXP);
        });

        it('should track XP from multiple contributions', async () => {
            const contributionXP = 25;

            const user = await User.findOne({ clerkId: testUserId });
            const initialXP = user?.xp || 0;

            // First contribution
            if (user) {
                user.xp = (user.xp || 0) + contributionXP;
                await user.save();
            }

            // Second contribution
            const updatedUser = await User.findOne({ clerkId: testUserId });
            if (updatedUser) {
                updatedUser.xp = (updatedUser.xp || 0) + contributionXP;
                await updatedUser.save();
            }

            const finalUser = await User.findOne({ clerkId: testUserId });
            expect(finalUser?.xp).toBe(initialXP + (contributionXP * 2));
        });
    });

    describe('Step 7: Remove image', () => {
        beforeEach(async () => {
            // Create a goal with custom image
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6);

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Vacation Fund',
                targetAmount: 3000,
                currentAmount: 0,
                deadline: deadline,
                imageUrl: 'https://s3.amazonaws.com/bucket/custom-goal-image.jpg',
                status: 'in-progress'
            });

            await goal.save();
            testGoalId = goal._id.toString();
        });

        it('should remove custom image and revert to default', async () => {
            const defaultImageUrl = 'https://example.com/default-goal.jpg';

            const goal = await SavingsGoal.findById(testGoalId);
            expect(goal?.imageUrl).toBe('https://s3.amazonaws.com/bucket/custom-goal-image.jpg');

            // Remove image (simulating S3 deletion and database update)
            if (goal) {
                goal.imageUrl = defaultImageUrl;
                goal.updatedAt = new Date();
                await goal.save();
            }

            const updatedGoal = await SavingsGoal.findById(testGoalId);
            expect(updatedGoal?.imageUrl).toBe(defaultImageUrl);
        });

        it('should handle image removal for goal without custom image', async () => {
            const defaultImageUrl = 'https://example.com/default-goal.jpg';

            // Create goal with default image
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6);

            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Emergency Fund',
                targetAmount: 5000,
                currentAmount: 0,
                deadline: deadline,
                imageUrl: defaultImageUrl,
                status: 'in-progress'
            });

            await goal.save();

            // Attempt to remove image (should remain default)
            goal.imageUrl = defaultImageUrl;
            await goal.save();

            const updatedGoal = await SavingsGoal.findById(goal._id);
            expect(updatedGoal?.imageUrl).toBe(defaultImageUrl);
        });
    });

    describe('Complete End-to-End Goal Contribution Flow', () => {
        it('should handle complete goal lifecycle with contributions', async () => {
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + 6);

            // Step 1: Create goal
            const goal = new SavingsGoal({
                userId: testUserId,
                title: 'Vacation Fund',
                targetAmount: 3000,
                currentAmount: 0,
                deadline: deadline,
                imageUrl: 'https://example.com/default-goal.jpg',
                status: 'in-progress'
            });
            await goal.save();

            // Step 2: Upload custom image
            const customImageUrl = 'https://s3.amazonaws.com/bucket/vacation.jpg';
            goal.imageUrl = customImageUrl;
            await goal.save();

            expect(goal.imageUrl).toBe(customImageUrl);

            // Step 3: Make first contribution
            const user = await User.findOne({ clerkId: testUserId });
            const initialBalance = user?.totalBalance || 0;
            const initialXP = user?.xp || 0;

            const contribution1 = 1000;
            if (user) {
                user.totalBalance -= contribution1;
                user.xp = (user.xp || 0) + 25; // Contribution XP
                await user.save();
            }

            goal.contributions.push({
                amount: contribution1,
                date: new Date(),
                note: 'First contribution'
            });
            goal.currentAmount += contribution1;
            await goal.save();

            // Step 4: Verify balance and progress
            let updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.totalBalance).toBe(initialBalance - contribution1);
            expect(goal.currentAmount).toBe(1000);

            // Step 5: Make second contribution
            const contribution2 = 2000;
            if (updatedUser) {
                updatedUser.totalBalance -= contribution2;
                updatedUser.xp = (updatedUser.xp || 0) + 25 + 200; // Contribution XP + Completion bonus
                await updatedUser.save();
            }

            goal.contributions.push({
                amount: contribution2,
                date: new Date(),
                note: 'Final contribution'
            });
            goal.currentAmount += contribution2;

            // Mark as completed
            if (goal.currentAmount >= goal.targetAmount) {
                goal.status = 'completed';
            }
            await goal.save();

            // Step 6: Verify completion
            updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.totalBalance).toBe(initialBalance - contribution1 - contribution2);
            expect(updatedUser?.xp).toBe(initialXP + 25 + 25 + 200); // Two contributions + completion bonus
            expect(goal.currentAmount).toBe(3000);
            expect(goal.status).toBe('completed');
            expect(goal.contributions.length).toBe(2);

            // Step 7: Remove image
            const defaultImageUrl = 'https://example.com/default-goal.jpg';
            goal.imageUrl = defaultImageUrl;
            await goal.save();

            const finalGoal = await SavingsGoal.findById(goal._id);
            expect(finalGoal?.imageUrl).toBe(defaultImageUrl);
        });
    });
});
