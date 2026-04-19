#import <React/RCTBridgeModule.h>
#import <GameKit/GameKit.h>

@interface GameCenterManager : NSObject <RCTBridgeModule, GKGameCenterControllerDelegate>

// Authenticate local player
- (void)authenticatePlayer:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject;

// Submit score to leaderboard
- (void)submitScore:(NSString *)leaderboardID
              score:(NSInteger)score
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject;

// Load leaderboard scores
- (void)loadLeaderboard:(NSString *)leaderboardID
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject;

// Show GameCenter leaderboard UI
- (void)showLeaderboard:(NSString *)leaderboardID
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject;

// Report achievement
- (void)reportAchievement:(NSString *)achievementID
           percentComplete:(double)percentComplete
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject;

// Reset achievements
- (void)resetAchievements:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject;

@end
