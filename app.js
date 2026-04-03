document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const testSelector = document.getElementById('testSelector');
    const loadTestButton = document.getElementById('loadTestButton');
    const viewHistoryButton = document.getElementById('viewHistoryButton');
    const clearHistoryButton = document.getElementById('clearHistoryButton');
    const testContainer = document.getElementById('test-container');
    const resultsArea = document.getElementById('results-area');
    const chartArea = document.getElementById('chart-area');
    const resultsChartCanvas = document.getElementById('resultsChart');
    let resultsChartInstance = null;

    // Pagination Elements
    const paginationControls = document.getElementById('pagination-controls');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitTestBtn = document.getElementById('submitTestBtn');
    const questionCounter = document.getElementById('questionCounter');

    // Timer Elements
    const enableTimerCheckbox = document.getElementById('enableTimer');
    const timerMinutesInput = document.getElementById('timerMinutes');
    const timerDisplay = document.getElementById('timer-display');
    const timeRemainingSpan = document.getElementById('timeRemaining');

    // State Variables
    let currentTestFile = '';
    let testData = null;
    let currentQuestionIndex = 0;
    let userAnswers = []; // userAnswers[index] = 'A'
    let timerInterval = null;
    let timeRemainingSeconds = 0;

    // Inicializar: Fetch list of tests from API
    fetch('/api/tests')
        .then(res => res.json())
        .then(tests => {
            testSelector.innerHTML = '';
            tests.forEach(test => {
                const option = document.createElement('option');
                option.value = test;
                // Formatear el nombre (e.g. test1.json -> Test 1)
                const name = test.replace('.json', '');
                option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
                testSelector.appendChild(option);
            });
            if (tests.length > 0) {
                // No cargar automáticamente, esperar a que lo pida
            }
        })
        .catch(err => {
            console.error('Error fetching tests:', err);
            testSelector.innerHTML = '<option value="">Error cargando tests</option>';
            // Fallback en caso de no usar servidor node sino estático puro
            // Llenaremos con unos cuantos default por si acaso:
            for(let i=1; i<=26; i++) {
                const opt = document.createElement('option');
                opt.value = `test${i}.json`;
                opt.textContent = `Test ${i}`;
                testSelector.appendChild(opt);
            }
        });

    // Events
    loadTestButton.addEventListener('click', () => {
        const selectedTest = testSelector.value;
        if(selectedTest) {
            startTest(selectedTest);
        }
    });

    viewHistoryButton.addEventListener('click', renderHistory);
    clearHistoryButton.addEventListener('click', clearHistory);

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderCurrentQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < testData.questions.length - 1) {
            currentQuestionIndex++;
            renderCurrentQuestion();
        }
    });

    submitTestBtn.addEventListener('click', () => {
        finishTest();
    });

    // Functions
    function startTest(testFile) {
        currentTestFile = testFile;
        // Clean UP previous
        clearInterval(timerInterval);
        resultsArea.innerHTML = '';
        chartArea.style.display = 'none';
        
        fetch(`tests/${testFile}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (!data.questions || !Array.isArray(data.questions)) {
                    throw new Error('El archivo no tiene el formato esperado.');
                }
                testData = data;
                userAnswers = new Array(data.questions.length).fill(null);
                currentQuestionIndex = 0;
                
                setupTimer();
                renderCurrentQuestion();
                paginationControls.style.display = 'flex';
                document.getElementById('controls-section').style.display = 'none'; // ocultar controles al iniciar
            })
            .catch(error => {
                console.error(error);
                testContainer.innerHTML = `<p style="color:var(--color-danger)">Error: ${error.message}</p>`;
            });
    }

    function setupTimer() {
        if (enableTimerCheckbox.checked) {
            timerDisplay.style.display = 'block';
            const minutes = parseInt(timerMinutesInput.value) || 30;
            timeRemainingSeconds = minutes * 60;
            updateTimerDisplay();

            timerInterval = setInterval(() => {
                timeRemainingSeconds--;
                updateTimerDisplay();
                if (timeRemainingSeconds <= 0) {
                    clearInterval(timerInterval);
                    alert('¡Tiempo agotado! Se enviará tu examen ahora.');
                    finishTest();
                }
            }, 1000);
        } else {
            timerDisplay.style.display = 'none';
        }
    }

    function updateTimerDisplay() {
        const m = Math.floor(timeRemainingSeconds / 60).toString().padStart(2, '0');
        const s = (timeRemainingSeconds % 60).toString().padStart(2, '0');
        timeRemainingSpan.textContent = `${m}:${s}`;
        
        if (timeRemainingSeconds < 60) {
            timeRemainingSpan.style.color = 'var(--color-danger)';
        } else {
            timeRemainingSpan.style.color = 'var(--color-primary)';
        }
    }

    function renderCurrentQuestion() {
        testContainer.innerHTML = '';
        
        const question = testData.questions[currentQuestionIndex];
        
        const card = document.createElement('div');
        card.className = 'question-card';
        card.innerHTML = `
            <p>${currentQuestionIndex + 1}. ${question.question}</p>
            <ul>
                ${question.options.map((option, i) => {
                    const optionIdentifier = option.split(')')[0].trim();
                    const isChecked = userAnswers[currentQuestionIndex] === optionIdentifier ? 'checked' : '';
                    return `
                    <li>
                        <label>
                            <input type="radio" name="q${currentQuestionIndex}" value="${optionIdentifier}" ${isChecked}>
                            ${option}
                        </label>
                    </li>
                    `;
                }).join('')}
            </ul>
        `;
        
        testContainer.appendChild(card);
        
        // Atar eventos a los radios para guardar respuesta
        const radios = card.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                userAnswers[currentQuestionIndex] = e.target.value;
            });
        });

        // Actualizar botones
        questionCounter.textContent = `Pregunta ${currentQuestionIndex + 1} de ${testData.questions.length}`;
        
        prevBtn.style.visibility = currentQuestionIndex === 0 ? 'hidden' : 'visible';
        
        if (currentQuestionIndex === testData.questions.length - 1) {
            nextBtn.style.display = 'none';
            submitTestBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitTestBtn.style.display = 'none';
        }
    }

    function finishTest() {
        clearInterval(timerInterval);
        timerDisplay.style.display = 'none';
        paginationControls.style.display = 'none';
        document.getElementById('controls-section').style.display = 'flex'; // mostrar controles
        testContainer.innerHTML = ''; // <-- LIMPIAR PANTALLA AQUI

        const results = [];
        testData.questions.forEach((q, idx) => {
            const isCorrect = userAnswers[idx] === q.correctAnswer;
            results.push({
                isCorrect: isCorrect,
                userAns: userAnswers[idx],
                correctAns: q.correctAnswer
            });
        });

        const correctCount = results.filter(r => r.isCorrect).length;
        const total = testData.questions.length;
        const percentage = ((correctCount / total) * 100).toFixed(2);
        // Nota sobre 10
        const nota = ((correctCount / total) * 10).toFixed(2);

        // Render Results Message
        resultsArea.innerHTML = `
            <div class="results-message">
                <h2>Test Completado</h2>
                <div class="score">${nota} / 10</div>
                <p>Aciertos: ${correctCount} de ${total} (${percentage}%)</p>
                <div style="margin-top: 1rem;">
                    <button id="showCorrectionBtn">Ver Corrección</button>
                </div>
            </div>
        `;

        saveHistory(correctCount, total, percentage, nota);
        renderChart(results);

        document.getElementById('showCorrectionBtn').addEventListener('click', () => {
            renderCorrection(results);
        });
    }

    function renderCorrection(results) {
        testContainer.innerHTML = '<h2>Revisión de respuestas</h2>';
        
        testData.questions.forEach((q, idx) => {
            const r = results[idx];
            const card = document.createElement('div');
            card.className = 'question-card';
            
            let optionsHtml = '';
            q.options.forEach(opt => {
                const optLetter = opt.split(')')[0].trim();
                let extraClass = '';
                
                if (optLetter === q.correctAnswer) {
                    extraClass = 'option-correct';
                } else if (optLetter === r.userAns && !r.isCorrect) {
                    extraClass = 'option-incorrect';
                }

                optionsHtml += `
                    <li>
                        <label class="${extraClass}">
                            <input type="radio" disabled ${optLetter === r.userAns ? 'checked' : ''}>
                            ${opt}
                        </label>
                    </li>
                `;
            });

            card.innerHTML = `
                <p><strong>${idx + 1}. ${q.question}</strong></p>
                <ul>${optionsHtml}</ul>
                ${!r.isCorrect ? `<div class="correct-answer-text">La respuesta correcta era la <strong>${q.correctAnswer}</strong>.</div>` : ''}
            `;
            testContainer.appendChild(card);
        });
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function saveHistory(correctCount, total, percentage, nota) {
        const date = new Date().toLocaleString();
        const stored = JSON.parse(localStorage.getItem('testTcaeHistory')) || [];
        stored.push({ date, test: currentTestFile, correct: correctCount, total, percentage, nota });
        localStorage.setItem('testTcaeHistory', JSON.stringify(stored));
    }

    function renderHistory() {
        const stored = JSON.parse(localStorage.getItem('testTcaeHistory')) || [];
        testContainer.innerHTML = '';
        resultsArea.innerHTML = '';
        chartArea.style.display = 'none';
        paginationControls.style.display = 'none';

        if (stored.length === 0) {
            testContainer.innerHTML = `<p style="text-align:center;">No hay resultados guardados en el historial.</p>`;
            return;
        }

        const tableHtml = `
            <h2>Historial de Resultados</h2>
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Test</th>
                        <th>Nota (s/10)</th>
                        <th>Aciertos</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
                    ${stored.map(entry => `
                        <tr>
                            <td>${entry.date}</td>
                            <td>${entry.test.replace('.json', '')}</td>
                            <td style="font-weight:bold; color: ${entry.nota >= 5 ? 'var(--color-success)' : 'var(--color-danger)'}">${entry.nota}</td>
                            <td>${entry.correct} / ${entry.total}</td>
                            <td>${entry.percentage}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        testContainer.innerHTML = tableHtml;
    }

    function clearHistory() {
        if (confirm('¿Estás seguro de que quieres borrar el historial de notas?')) {
            localStorage.removeItem('testTcaeHistory');
            testContainer.innerHTML = `<p style="text-align:center; color: var(--color-success)">El historial ha sido borrado.</p>`;
        }
    }

    function renderChart(results) {
        chartArea.style.display = 'block';
        const ctx = resultsChartCanvas.getContext('2d');
        
        if (resultsChartInstance) {
            resultsChartInstance.destroy();
        }

        const labels = results.map((_, i) => `P${i + 1}`);
        const dataVals = results.map(r => r.isCorrect ? 1 : 0);
        const bgColors = results.map(r => r.isCorrect ? '#28a745' : '#dc3545');

        resultsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '1 = Acertada, 0 = Fallada',
                    data: dataVals,
                    backgroundColor: bgColors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1.2,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
});