#import "GameCenterManager.h"

@implementation GameCenterManager

RCT_EXPORT_MODULE(GameCenter);

RCT_EXPORT_METHOD(authenticatePlayer:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject)
{
    if ([GKLocalPlayer localPlayer].authenticated) {
        resolve(@YES);
        return;
    }

    [[GKLocalPlayer localPlayer] authenticateWithCompletionHandler:^(NSError *error) {
        if (error) {
            reject(@"AUTH_ERROR", @"Failed to authenticate with GameCenter", error);
        } else {
            resolve(@YES);
        }
    }];
}

RCT_EXPORT_METHOD(submitScore:(NSString *)leaderboardID
                        score:(NSInteger)score
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject)
{
    GKScore *scoreReporter = [[GKScore alloc] initWithLeaderboardIdentifier:leaderboardID];
    scoreReporter.value = score;

    [GKScore reportScores:@[scoreReporter] withCompletionHandler:^(NSError *error) {
        if (error) {
            reject(@"SCORE_ERROR", @"Failed to submit score", error);
        } else {
            resolve(@YES);
        }
    }];
}

RCT_EXPORT_METHOD(loadLeaderboard:(NSString *)leaderboardID
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject)
{
    GKLeaderboard *leaderboard = [[GKLeaderboard alloc] init];
    leaderboard.identifier = leaderboardID;
    leaderboard.playerScope = GKLeaderboardPlayerScopeGlobal;
    leaderboard.timeScope = GKLeaderboardTimeScopeAllTime;
    leaderboard.range = NSMakeRange(1, 100);

    [leaderboard loadScoresWithCompletionHandler:^(NSArray *scores, NSError *error) {
        if (error) {
            reject(@"LOAD_ERROR", @"Failed to load leaderboard", error);
        } else {
            NSMutableArray *scoreArray = [NSMutableArray array];
            for (GKScore *score in scores) {
                [scoreArray addObject:@{
                    @"rank": @(score.rank),
                    @"playerID": score.player.playerID,
                    @"displayName": score.player.displayName,
                    @"score": @(score.value)
                }];
            }

            // Get local player score
            GKScore *localPlayerScore = nil;
            if (leaderboard.localPlayerScore) {
                localPlayerScore = leaderboard.localPlayerScore;
            }

            resolve(@{
                @"scores": scoreArray,
                @"localPlayerScore": localPlayerScore ? @{
                    @"rank": @(localPlayerScore.rank),
                    @"score": @(localPlayerScore.value)
                } : nil
            });
        }
    }];
}

RCT_EXPORT_METHOD(showLeaderboard:(NSString *)leaderboardID
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject)
{
    GKGameCenterViewController *gameCenterController = [[GKGameCenterViewController alloc] init];
    if (gameCenterController) {
        gameCenterController.gameCenterDelegate = self;
        gameCenterController.leaderboardIdentifier = leaderboardID;
        gameCenterController.viewState = GKGameCenterViewControllerStateLeaderboards;

        UIViewController *rootViewController = [UIApplication sharedApplication].keyWindow.rootViewController;
        [rootViewController presentViewController:gameCenterController animated:YES completion:^{
            resolve(@YES);
        }];
    } else {
        reject(@"SHOW_ERROR", @"Failed to show GameCenter", nil);
    }
}

RCT_EXPORT_METHOD(reportAchievement:(NSString *)achievementID
                     percentComplete:(double)percentComplete
                            resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject)
{
    GKAchievement *achievement = [[GKAchievement alloc] initWithIdentifier:achievementID];
    achievement.percentComplete = percentComplete;
    achievement.showsCompletionBanner = YES;

    [GKAchievement reportAchievements:@[achievement] withCompletionHandler:^(NSError *error) {
        if (error) {
            reject(@"ACHIEVEMENT_ERROR", @"Failed to report achievement", error);
        } else {
            resolve(@YES);
        }
    }];
}

RCT_EXPORT_METHOD(resetAchievements:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject)
{
    [GKAchievement resetAchievementsWithCompletionHandler:^(NSError *error) {
        if (error) {
            reject(@"RESET_ERROR", @"Failed to reset achievements", error);
        } else {
            resolve(@YES);
        }
    }];
}

#pragma mark - GKGameCenterControllerDelegate

- (void)gameCenterViewControllerDidFinish:(GKGameCenterViewController *)gameCenterViewController
{
    [gameCenterViewController dismissViewControllerAnimated:YES completion:nil];
}

@end
