# SmartWallet Gamification Implementation Guide

This guide covers the implementation of gamification features to enhance user engagement and promote healthy financial habits.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Achievement System](#achievement-system)
7. [Points & Rewards](#points--rewards)
8. [Leaderboards](#leaderboards)
9. [Challenges](#challenges)
10. [Testing](#testing)

---

## Overview

### Gamification Features

- **Achievement System**: Unlock badges for financial milestones
- **Points & Levels**: Earn XP for positive financial behaviors
- **Challenges**: Weekly/monthly financial goals
- **Leaderboards**: Compare progress with friends (optional)
- **Streaks**: Track consecutive days of budget adherence
- **Rewards**: Unlock features and customizations

### User Engagement Goals

- Encourage regular budget tracking
- Promote savings habits
- Reduce overspending
- Increase financial literacy
- Build long-term financial discipline

---

## Core Components

### 1. Achievement System

```typescript
// Types
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'savings' | 'budgeting' | 'spending' | 'streak' | 'milestone';
  criteria: AchievementCriteria;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface AchievementCriteria {
  type: 'savings_goal' | 'budget_adherence' | 'transaction_count' | 'streak_days';
  target: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}
```

### 2. User Progress Tracking

```typescript
interface UserGameData {
  userId: string;
  level: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  achievements: UserAchievement[];
  challenges: UserChallenge[];
  lastActivity: Date;
}

interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
  progress: number;
  completed: boolean;
}
```

---

## Database Schema

### MongoDB Collections

#### 1. Achievements Collection

```javascript
// server/models/Achievement.js
const achievementSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  category: {
    type: String,
    enum: ['savings', 'budgeting', 'spending', 'streak', 'milestone'],
    required: true
  },
  criteria: {
    type: { type: String, required: true },
    target: { type: Number, required: true },
    timeframe: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] }
  },
  points: { type: Number, required: true },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: { type: Boolean, default: true }
});
```

#### 2. User Game Data Collection

```javascript
// server/models/UserGameData.js
const userGameDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  level: { type: Number, default: 1 },
  totalPoints: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  achievements: [{
    achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false }
  }],
  challenges: [{
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    reward: { type: Number, default: 0 }
  }],
  lastActivity: { type: Date, default: Date.now }
});
```

#### 3. Challenges Collection

```javascript
// server/models/Challenge.js
const challengeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ['save_amount', 'budget_adherence', 'reduce_spending', 'track_expenses'],
    required: true
  },
  target: { type: Number, required: true },
  duration: { type: Number, required: true }, // days
  reward: { type: Number, required: true }, // points
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  isActive: { type: Boolean, default: true }
});
```

---

## Backend Implementation

### 1. Gamification Service

```javascript
// server/services/gamificationService.js
class GamificationService {
  
  // Award points for user actions
  async awardPoints(userId, action, amount = 0) {
    const pointsMap = {
      'add_transaction': 5,
      'create_budget': 25,
      'achieve_savings_goal': 100,
      'complete_challenge': 50,
      'daily_login': 10
    };

    const points = pointsMap[action] || 0;
    
    const gameData = await UserGameData.findOneAndUpdate(
      { userId },
      { 
        $inc: { totalPoints: points },
        $set: { lastActivity: new Date() }
      },
      { upsert: true, new: true }
    );

    // Check for level up
    await this.checkLevelUp(userId, gameData.totalPoints);
    
    // Check achievements
    await this.checkAchievements(userId, action, amount);
    
    return { points, totalPoints: gameData.totalPoints };
  }

  // Check if user leveled up
  async checkLevelUp(userId, totalPoints) {
    const currentLevel = Math.floor(totalPoints / 1000) + 1;
    
    const gameData = await UserGameData.findOne({ userId });
    if (currentLevel > gameData.level) {
      await UserGameData.updateOne(
        { userId },
        { level: currentLevel }
      );
      
      // Award level up bonus
      await this.awardPoints(userId, 'level_up');
      
      return { leveledUp: true, newLevel: currentLevel };
    }
    
    return { leveledUp: false };
  }

  // Check and unlock achievements
  async checkAchievements(userId, action, amount) {
    const achievements = await Achievement.find({ isActive: true });
    const gameData = await UserGameData.findOne({ userId });
    
    for (const achievement of achievements) {
      const userAchievement = gameData.achievements.find(
        ua => ua.achievementId.toString() === achievement._id.toString()
      );
      
      if (userAchievement?.completed) continue;
      
      const progress = await this.calculateAchievementProgress(
        userId, 
        achievement, 
        action, 
        amount
      );
      
      if (progress >= achievement.criteria.target) {
        await this.unlockAchievement(userId, achievement._id);
      }
    }
  }

  // Update streak
  async updateStreak(userId) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const gameData = await UserGameData.findOne({ userId });
    const lastActivity = new Date(gameData.lastActivity);
    
    let newStreak = gameData.currentStreak;
    
    if (this.isSameDay(lastActivity, yesterday)) {
      newStreak += 1;
    } else if (!this.isSameDay(lastActivity, today)) {
      newStreak = 1;
    }
    
    const longestStreak = Math.max(gameData.longestStreak, newStreak);
    
    await UserGameData.updateOne(
      { userId },
      { 
        currentStreak: newStreak,
        longestStreak,
        lastActivity: today
      }
    );
    
    return { currentStreak: newStreak, longestStreak };
  }
}
```

### 2. API Routes

```javascript
// server/routes/gamification.js
const express = require('express');
const router = express.Router();
const GamificationService = require('../services/gamificationService');

const gamificationService = new GamificationService();

// Get user game data
router.get('/profile/:userId', async (req, res) => {
  try {
    const gameData = await UserGameData.findOne({ userId: req.params.userId })
      .populate('achievements.achievementId');
    
    res.json(gameData || { userId: req.params.userId, level: 1, totalPoints: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get achievements
router.get('/achievements', async (req, res) => {
  try {
    const achievements = await Achievement.find({ isActive: true });
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await UserGameData.find()
      .sort({ totalPoints: -1 })
      .limit(10)
      .select('userId level totalPoints');
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Award points manually (for testing)
router.post('/award-points', async (req, res) => {
  try {
    const { userId, action, amount } = req.body;
    const result = await gamificationService.awardPoints(userId, action, amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Frontend Implementation

### 1. Gamification Context

```typescript
// src/contexts/GamificationContext.tsx
interface GamificationContextType {
  gameData: UserGameData | null;
  achievements: Achievement[];
  awardPoints: (action: string, amount?: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  loading: boolean;
}

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameData, setGameData] = useState<UserGameData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  const fetchGameData = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/gamification/profile/${user.id}`);
      const data = await response.json();
      setGameData(data);
    } catch (error) {
      console.error('Failed to fetch game data:', error);
    }
  };

  const awardPoints = async (action: string, amount?: number) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/gamification/award-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action, amount })
      });
      
      if (response.ok) {
        await fetchGameData();
      }
    } catch (error) {
      console.error('Failed to award points:', error);
    }
  };

  return (
    <GamificationContext.Provider value={{
      gameData,
      achievements,
      awardPoints,
      updateStreak,
      loading
    }}>
      {children}
    </GamificationContext.Provider>
  );
};
```

### 2. Achievement Components

```typescript
// src/components/gamification/AchievementCard.tsx
interface AchievementCardProps {
  achievement: Achievement;
  userProgress?: number;
  unlocked?: boolean;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  userProgress = 0,
  unlocked = false
}) => {
  const progressPercentage = Math.min((userProgress / achievement.criteria.target) * 100, 100);

  return (
    <div className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="achievement-icon">
        <img src={achievement.icon} alt={achievement.name} />
        {unlocked && <div className="unlock-badge">✓</div>}
      </div>
      
      <div className="achievement-info">
        <h3>{achievement.name}</h3>
        <p>{achievement.description}</p>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="achievement-meta">
          <span className={`rarity ${achievement.rarity}`}>
            {achievement.rarity.toUpperCase()}
          </span>
          <span className="points">+{achievement.points} XP</span>
        </div>
      </div>
    </div>
  );
};
```

### 3. Points Display Component

```typescript
// src/components/gamification/PointsDisplay.tsx
export const PointsDisplay: React.FC = () => {
  const { gameData } = useGamification();
  const [showAnimation, setShowAnimation] = useState(false);

  const triggerPointsAnimation = (points: number) => {
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 2000);
  };

  return (
    <div className="points-display">
      <div className="level-badge">
        <span className="level">LV {gameData?.level || 1}</span>
      </div>
      
      <div className="points-info">
        <div className="total-points">
          {gameData?.totalPoints || 0} XP
        </div>
        
        <div className="level-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${((gameData?.totalPoints || 0) % 1000) / 10}%` 
              }}
            />
          </div>
          <span className="next-level">
            {1000 - ((gameData?.totalPoints || 0) % 1000)} XP to next level
          </span>
        </div>
      </div>

      {showAnimation && (
        <div className="points-animation">
          +{gameData?.totalPoints} XP
        </div>
      )}
    </div>
  );
};
```

---

## Achievement System

### Predefined Achievements

```javascript
// server/data/achievements.js
const achievements = [
  {
    name: "First Steps",
    description: "Add your first transaction",
    icon: "/icons/first-steps.svg",
    category: "milestone",
    criteria: { type: "transaction_count", target: 1 },
    points: 25,
    rarity: "common"
  },
  {
    name: "Budget Master",
    description: "Stay within budget for 7 consecutive days",
    icon: "/icons/budget-master.svg",
    category: "budgeting",
    criteria: { type: "budget_adherence", target: 7, timeframe: "daily" },
    points: 100,
    rarity: "rare"
  },
  {
    name: "Savings Champion",
    description: "Save $1000 in a single month",
    icon: "/icons/savings-champion.svg",
    category: "savings",
    criteria: { type: "savings_goal", target: 1000, timeframe: "monthly" },
    points: 200,
    rarity: "epic"
  },
  {
    name: "Streak Legend",
    description: "Maintain a 30-day activity streak",
    icon: "/icons/streak-legend.svg",
    category: "streak",
    criteria: { type: "streak_days", target: 30 },
    points: 500,
    rarity: "legendary"
  }
];
```

### Achievement Integration

```typescript
// Integrate with existing transaction creation
const handleAddTransaction = async (transactionData) => {
  try {
    // Create transaction
    const transaction = await createTransaction(transactionData);
    
    // Award points for adding transaction
    await awardPoints('add_transaction');
    
    // Check if this helps with any challenges
    await checkChallengeProgress('add_transaction', transactionData.amount);
    
    return transaction;
  } catch (error) {
    console.error('Failed to add transaction:', error);
  }
};
```

---

## Points & Rewards

### Point Values

```javascript
const POINT_VALUES = {
  'add_transaction': 5,
  'create_budget': 25,
  'achieve_savings_goal': 100,
  'complete_challenge': 50,
  'daily_login': 10,
  'stay_within_budget': 20,
  'level_up': 100,
  'unlock_achievement': 50
};
```

### Reward System

```typescript
// src/components/gamification/RewardShop.tsx
interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'theme' | 'feature' | 'badge';
  unlocked: boolean;
}

export const RewardShop: React.FC = () => {
  const { gameData, purchaseReward } = useGamification();
  const [rewards] = useState<Reward[]>([
    {
      id: 'dark_theme',
      name: 'Dark Theme',
      description: 'Unlock the sleek dark theme',
      cost: 500,
      type: 'theme',
      unlocked: false
    },
    {
      id: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Detailed spending insights and trends',
      cost: 1000,
      type: 'feature',
      unlocked: false
    }
  ]);

  return (
    <div className="reward-shop">
      <h2>Reward Shop</h2>
      <div className="current-points">
        You have {gameData?.totalPoints || 0} XP
      </div>
      
      <div className="rewards-grid">
        {rewards.map(reward => (
          <RewardCard 
            key={reward.id}
            reward={reward}
            canAfford={(gameData?.totalPoints || 0) >= reward.cost}
            onPurchase={() => purchaseReward(reward.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## Testing

### Unit Tests

```javascript
// server/tests/gamificationService.test.js
describe('GamificationService', () => {
  let gamificationService;
  
  beforeEach(() => {
    gamificationService = new GamificationService();
  });

  test('should award points for valid actions', async () => {
    const result = await gamificationService.awardPoints('user123', 'add_transaction');
    expect(result.points).toBe(5);
  });

  test('should check for level up', async () => {
    const result = await gamificationService.checkLevelUp('user123', 1500);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
  });

  test('should update streak correctly', async () => {
    const result = await gamificationService.updateStreak('user123');
    expect(result.currentStreak).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```javascript
// server/tests/gamification.integration.test.js
describe('Gamification API', () => {
  test('GET /api/gamification/profile/:userId', async () => {
    const response = await request(app)
      .get('/api/gamification/profile/user123')
      .expect(200);
    
    expect(response.body).toHaveProperty('level');
    expect(response.body).toHaveProperty('totalPoints');
  });

  test('POST /api/gamification/award-points', async () => {
    const response = await request(app)
      .post('/api/gamification/award-points')
      .send({ userId: 'user123', action: 'add_transaction' })
      .expect(200);
    
    expect(response.body.points).toBe(5);
  });
});
```

---

## Deployment Considerations

### Environment Variables

```env
# Gamification Features
ENABLE_GAMIFICATION=true
GAMIFICATION_POINT_MULTIPLIER=1.0
ACHIEVEMENT_CACHE_TTL=3600
LEADERBOARD_UPDATE_INTERVAL=300
```

### Performance Optimization

- Cache achievement data in Redis
- Batch process point calculations
- Use database indexes for leaderboard queries
- Implement rate limiting for point awards

### Monitoring

- Track achievement unlock rates
- Monitor point inflation
- Measure user engagement metrics
- Alert on unusual point award patterns

This implementation provides a comprehensive gamification system that encourages positive financial behaviors while maintaining user engagement through achievements, points, and rewards.