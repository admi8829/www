import { KotlinFile } from './types';

export const KOTLIN_PROJECT_FILES: KotlinFile[] = [
  {
    name: "QuestionEntity.kt",
    path: "app/src/main/java/edu/ethiopia/quiz/data/QuestionEntity.kt",
    description: "Definition of the Room Database Entity representing a 10th-grade curriculum quiz question.",
    code: `package edu.ethiopia.quiz.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "questions")
data class QuestionEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val subject: String,    // "Physics", "Chemistry", "Biology"
    val topic: String,      // e.g., "Electrostatics"
    val questionText: String,
    val optionA: String,
    val optionB: String,
    val optionC: String,
    val optionD: String,
    val correctAnswerIndex: Int, // 0 to 3
    val explanation: String
)
`
  },
  {
    name: "QuestionDao.kt",
    path: "app/src/main/java/edu/ethiopia/quiz/data/QuestionDao.kt",
    description: "Data Access Object (DAO) defining SQLite CRUD operations and reactive flow queries for Room.",
    code: `package edu.ethiopia.quiz.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface QuestionDao {

    @Query("SELECT * FROM questions WHERE subject = :subject ORDER BY RANDOM() LIMIT 5")
    suspend fun getRandomQuestionsBySubject(subject: String): List<QuestionEntity>

    @Query("SELECT COUNT(*) FROM questions")
    suspend fun getQuestionsCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(questions: List<QuestionEntity>)

    // High Score Persistence (stored in a separate table / preferences)
    @Query("SELECT MAX(score) FROM quiz_scores WHERE subject = :subject")
    fun getHighScoreForSubject(subject: String): Flow<Int?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScore(scoreEntity: ScoreEntity)
}

@Entity(tableName = "quiz_scores")
data class ScoreEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val subject: String,
    val score: Int,
    val timestamp: Long = System.currentTimeMillis()
)
`
  },
  {
    name: "AppDatabase.kt",
    path: "app/src/main/java/edu/ethiopia/quiz/data/AppDatabase.kt",
    description: "The main Database holder using Room. Includes thread-safe singleton initialization and pre-population with core 10th-grade topics.",
    code: `package edu.ethiopia.quiz.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(entities = [QuestionEntity::class, ScoreEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun questionDao(): QuestionDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "ethiopian_quiz_database"
                )
                .addCallback(AppDatabaseCallback(scope))
                .build()
                INSTANCE = instance
                instance
            }
        }
    }

    private class AppDatabaseCallback(
        private val scope: CoroutineScope
    ) : RoomDatabase.Callback() {
        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            INSTANCE?.let { database ->
                scope.launch(Dispatchers.IO) {
                    populateDatabase(database.questionDao())
                }
            }
        }

        suspend fun populateDatabase(dao: QuestionDao) {
            val initialQuestions = listOf(
                QuestionEntity(
                    subject = "Physics",
                    topic = "Electrostatics",
                    questionText = "According to Coulomb's Law, if the distance between two charges is halved, how does the force change?",
                    optionA = "Force becomes half",
                    optionB = "Force becomes double",
                    optionC = "Force decreases to 1/4th",
                    optionD = "Force increases to 4 times",
                    correctAnswerIndex = 3,
                    explanation = "F is inversely proportional to r^2. If r is halved, F becomes 4 times."
                ),
                QuestionEntity(
                    subject = "Chemistry",
                    topic = "Saturated Hydrocarbons",
                    questionText = "What is the general molecular formula for alkanes?",
                    optionA = "C_n H_2n",
                    optionB = "C_n H_2n-2",
                    optionC = "C_n H_2n+2",
                    optionD = "C_n H_n",
                    correctAnswerIndex = 2,
                    explanation = "The general formula for saturated hydrocarbons (alkanes) is C_n H_2n+2."
                ),
                QuestionEntity(
                    subject = "Biology",
                    topic = "Plants",
                    questionText = "Which vascular tissue transports water and minerals upwards from root to leaf?",
                    optionA = "Phloem",
                    optionB = "Xylem",
                    optionC = "Cortex",
                    optionD = "Epidermis",
                    correctAnswerIndex = 1,
                    explanation = "Xylem is responsible for water transport; Phloem is for synthesized sugars."
                )
            )
            dao.insertAll(initialQuestions)
        }
    }
}
`
  },
  {
    name: "QuizViewModel.kt",
    path: "app/src/main/java/edu/ethiopia/quiz/ui/QuizViewModel.kt",
    description: "ViewModel acting as single source of truth. Handles timers using coroutine coroutines, UI State, and connects to the Room Database library.",
    code: `package edu.ethiopia.quiz.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import edu.ethiopia.quiz.data.QuestionDao
import edu.ethiopia.quiz.data.QuestionEntity
import edu.ethiopia.quiz.data.ScoreEntity
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class QuizUiState(
    val questions: List<QuestionEntity> = emptyList(),
    val currentQuestionIndex: Int = 0,
    val selectedOptionIndex: Int? = null,
    val isAnswerChecked: Boolean = false,
    val score: Int = 0,
    val timeRemaining: Int = 30,
    val isQuizFinished: Boolean = false
)

class QuizViewModel(private val dao: QuestionDao) : ViewModel() {

    private val _uiState = MutableStateFlow(QuizUiState())
    val uiState: StateFlow<QuizUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null

    fun loadQuiz(subject: String) {
        viewModelScope.launch {
            val fetched = dao.getRandomQuestionsBySubject(subject)
            _uiState.update {
                QuizUiState(
                    questions = fetched,
                    currentQuestionIndex = 0,
                    selectedOptionIndex = null,
                    isAnswerChecked = false,
                    score = 0,
                    timeRemaining = 30,
                    isQuizFinished = false
                )
            }
            startTimer()
        }
    }

    private fun startTimer() {
        timerJob?.cancel()
        _uiState.update { it.copy(timeRemaining = 30) }
        timerJob = viewModelScope.launch {
            while (_uiState.value.timeRemaining > 0 && !_uiState.value.isAnswerChecked) {
                delay(1000L)
                _uiState.update { it.copy(timeRemaining = it.timeRemaining - 1) }
            }
            if (_uiState.value.timeRemaining == 0) {
                checkAnswer(timeout = true)
            }
        }
    }

    fun selectOption(index: Int) {
        if (_uiState.value.isAnswerChecked) return
        _uiState.update { it.copy(selectedOptionIndex = index) }
    }

    fun checkAnswer(timeout: Boolean = false) {
        if (_uiState.value.isAnswerChecked) return
        timerJob?.cancel()

        val state = _uiState.value
        val correctIndex = state.questions.getOrNull(state.currentQuestionIndex)?.correctAnswerIndex
        val isCorrect = !timeout && state.selectedOptionIndex == correctIndex

        _uiState.update {
            it.copy(
                isAnswerChecked = true,
                score = if (isCorrect) it.score + 1 else it.score
            )
        }
    }

    fun nextQuestion(subject: String) {
        val state = _uiState.value
        if (state.currentQuestionIndex + 1 < state.questions.size) {
            _uiState.update {
                it.copy(
                    currentQuestionIndex = it.currentQuestionIndex + 1,
                    selectedOptionIndex = null,
                    isAnswerChecked = false,
                    timeRemaining = 30
                )
            }
            startTimer()
        } else {
            finishQuiz(subject)
        }
    }

    private fun finishQuiz(subject: String) {
        _uiState.update { it.copy(isQuizFinished = true) }
        viewModelScope.launch {
            dao.insertScore(ScoreEntity(subject = subject, score = _uiState.value.score))
        }
    }

    fun getHighScoreFlow(subject: String) = dao.getHighScoreForSubject(subject)
}
`
  },
  {
    name: "DashboardScreen.kt",
    path: "app/src/main/java/edu/ethiopia/quiz/ui/screens/DashboardScreen.kt",
    description: "Android Home dashboard designed with Jetpack Compose LazyColumn, showcasing custom subject cards, grade indicators, and High Scores.",
    code: `package edu.ethiopia.quiz.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import edu.ethiopia.quiz.ui.QuizViewModel

data class Subject(val name: String, val icon: String, val color: Color)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: QuizViewModel,
    onSubjectSelect: (String) -> Unit
) {
    val subjects = listOf(
        Subject("Physics", "⚛️", Color(0xFF1E88E5)),
        Subject("Chemistry", "🧪", Color(0xFF43A047)),
        Subject("Biology", "🌿", Color(0xFFFDD835))
    )

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Grade 10 Ethiopian Quiz", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = "Subjects Overview",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Select a subject aligned with the national curriculum to start standard practice.",
                    fontSize = 14.sp,
                    color = Color.Gray
                )
            }

            items(subjects) { subject ->
                val highScoreState = viewModel.getHighScoreFlow(subject.name).collectAsState(initial = null)
                val highScore = highScoreState.value ?: 0

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSubjectSelect(subject.name) },
                    colors = CardDefaults.cardColors(containerColor = subject.color.copy(alpha = 0.15f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(subject.icon, fontSize = 40.sp)
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = subject.name,
                                fontSize = 21.sp,
                                fontWeight = FontWeight.Heavy
                            )
                            Text(
                                text = "Grade 10 National Syllabus",
                                fontSize = 12.sp,
                                color = Color.DarkGray
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "High Score",
                                fontSize = 11.sp,
                                color = Color.Gray
                            )
                            Text(
                                text = "$highScore/5",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        }
    }
}
`
  },
  {
    name: "QuizScreen.kt",
    path: "app/src/main/java/edu/ethiopia/quiz/ui/screens/QuizScreen.kt",
    description: "The core gameplay interface. Displays the current question with dynamic custom-themed option selection states and countdowns.",
    code: `package edu.ethiopia.quiz.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import edu.ethiopia.quiz.ui.QuizViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuizScreen(
    subject: String,
    viewModel: QuizViewModel,
    onBackToDashboard: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val currentQuestion = state.questions.getOrNull(state.currentQuestionIndex)

    if (state.isQuizFinished) {
        SummaryScreen(
            subject = subject,
            score = state.score,
            total = state.questions.size,
            onRestart = { viewModel.loadQuiz(subject) },
            onDashboard = onBackToDashboard
        )
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("$subject Quiz", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            if (currentQuestion == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                return@Scaffold
            }

            // Progress Header
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Question \${state.currentQuestionIndex + 1} of \${state.questions.size}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    
                    // Countdown Display
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(21.dp))
                            .background(
                                if (state.timeRemaining < 10) Color.Red.copy(alpha = 0.15f)
                                else Color.Green.copy(alpha = 0.15f)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "\${state.timeRemaining}",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (state.timeRemaining < 10) Color.Red else Color.Green
                        )
                    }
                }
                
                // Progress Bar
                LinearProgressIndicator(
                    progress = (state.currentQuestionIndex + 1).toFloat() / state.questions.size,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                )
            }

            // Question Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(vertical = 12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = currentQuestion.questionText,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Option Selection Rows
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(2f)
            ) {
                val options = listOf(
                    currentQuestion.optionA,
                    currentQuestion.optionB,
                    currentQuestion.optionC,
                    currentQuestion.optionD
                )

                options.forEachIndexed { i, option ->
                    val isSelected = state.selectedOptionIndex == i
                    val isCorrectAnswer = currentQuestion.correctAnswerIndex == i
                    
                    val bkgColor by animateColorAsState(
                        targetValue = when {
                            state.isAnswerChecked && isCorrectAnswer -> Color(0xFFC8E6C9) // Perfect Green
                            state.isAnswerChecked && isSelected && !isCorrectAnswer -> Color(0xFFFFCDD2) // Red
                            isSelected -> MaterialTheme.colorScheme.primaryContainer
                            else -> MaterialTheme.colorScheme.surface
                        }
                    )

                    val borderAndTextColor = when {
                        state.isAnswerChecked && isCorrectAnswer -> Color(0xFF2E7D32)
                        state.isAnswerChecked && isSelected && !isCorrectAnswer -> Color(0xFFC62828)
                        isSelected -> MaterialTheme.colorScheme.primary
                        else -> Color.LightGray
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(bkgColor)
                            .border(1.dp, borderAndTextColor, RoundedCornerShape(8.dp))
                            .clickable(enabled = !state.isAnswerChecked) { viewModel.selectOption(i) }
                            .padding(16.dp)
                    ) {
                        Text(
                            text = option,
                            fontSize = 15.sp,
                            color = if (isSelected || (state.isAnswerChecked && (i == currentQuestion.correctAnswerIndex || isSelected))) Color.Black else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            // Footer State Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                if (!state.isAnswerChecked) {
                    Button(
                        onClick = { viewModel.checkAnswer() },
                        enabled = state.selectedOptionIndex != null,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Submit Answer", fontSize = 16.sp)
                    }
                } else {
                    Button(
                        onClick = { viewModel.nextQuestion(subject) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = if (state.currentQuestionIndex + 1 == state.questions.size) "Finish Quiz" else "Next Question",
                            fontSize = 16.sp
                        )
                    }
                }
            }
        }
    }
}
`
  },
  {
    name: "SummaryScreen.kt",
    path: "app/src/main/java/edu/ethiopia/quiz/ui/screens/SummaryScreen.kt",
    description: "Display screen showing final grades based on the score threshold, offering comprehensive review options.",
    code: `package edu.ethiopia.quiz.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SummaryScreen(
    subject: String,
    score: Int,
    total: Int,
    onRestart: () -> Unit,
    onDashboard: () -> Unit
) {
    val rating = when {
        score == total -> "Excellent! 🇪🇹 Academic Star"
        score >= total * 0.8 -> "Very Good! Keep striving!"
        score >= total * 0.5 -> "Good Effort! Satisfactory"
        else -> "Need Review! Try again to build mastery"
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterVertically,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Quiz Summary",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Text(
                    text = "Subject: $subject",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Text(
                    text = "$score / $total",
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = rating,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.secondary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = onRestart,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Retry Quiz", fontSize = 16.sp)
                }

                OutlinedButton(
                    onClick = onDashboard,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Back to Dashboard", fontSize = 16.sp)
                }
            }
        }
    }
}
`
  },
  {
    name: "build.gradle.kts",
    path: "app/build.gradle.kts",
    description: "Gradle Kotlin DSL configuration specifying requirements for Room, Coroutines, lifecycle components, and Jetpack Compose libraries.",
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
}

android {
    namespace = "edu.ethiopia.quiz"
    compileSdk = 34

    defaultConfig {
        applicationId = "edu.ethiopia.quiz"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.1"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX & Core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Jetpack Compose
    implementation(platform("androidx.compose:compose-bom:2023.08.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")

    // Room Database dependencies
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    kapt("androidx.room:room-compiler:$roomVersion")

    // Viewmodel Lifecycle
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
}
`
  }
];
