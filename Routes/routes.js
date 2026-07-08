import express from "express";

// User APIs
import { loginUser, registerUser } from "../Handler/validators.js";
import { validateUser } from "../Middleware/middleware.js";
import { latestQuestion, totalBets, userData } from "../Handler/user-dashboard-b.js";
import { addBetsData, questionData } from "../Handler/user-questions-b.js";
import { leaderboardData } from "../Handler/user-leaderboard-b.js";
import { userBetsList } from "../Handler/user-mybets-b.js";
import { userDataProfile } from "../Handler/user-profile-b.js";

// Admin APIs
import { question_Data } from "../Handler/admin-question-b.js";
import { deleteQuestion, manageQuestion, resolveQuestion, winOption } from "../Handler/admin-manage-questions-b.js";
import { activateUser, adminUserData, suspendUser, warnUser } from "../Handler/admin-user-b.js";
import { live_Questions_No, no_Of_Questions, no_Of_Users, total_Predictions } from "../Handler/admin-dashboard-b.js";

const routes = express.Router();

// User Routes
routes.post("/register",validateUser, registerUser);
routes.post("/login", loginUser);
routes.get("/user/:id", userData);
routes.get("/TotalBets/:id", totalBets);
// routes.post("/AddQuestions", addQuestion);
routes.get("/QuestionData", questionData);
routes.post("/AddBetsData", addBetsData);
routes.get("/UserBets/:id", userBetsList);
routes.get("/LatestQuestion", latestQuestion);
routes.get("/LeaderboardData", leaderboardData);
routes.get("/UserDataProfile/:id", userDataProfile);

// Admin Routes  
routes.post("/QuestionData", question_Data);
routes.get("/ManageQuestions", manageQuestion);
routes.put("/ResolveQuestions/:id", resolveQuestion);
routes.delete("/DeleteQuestions/:id", deleteQuestion);
routes.get("/UserData", adminUserData);
routes.put("/WarnUser/:id", warnUser);
routes.put("/SuspendUser/:id", suspendUser);
routes.put("/ActivateUser/:id", activateUser);
routes.get("/NoOfUsers", no_Of_Users);
routes.get("/NoOfQuestions", no_Of_Questions);
routes.get("/NoOfLiveQuestions", live_Questions_No);
routes.get("/NoOfTotalPredictions", total_Predictions);
routes.post("/AddWinnerData", winOption);

export default routes;