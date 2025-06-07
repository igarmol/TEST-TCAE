document.addEventListener('DOMContentLoaded', () => {
    const testContainer = document.getElementById('test-container');
    const resultsChart = document.getElementById('resultsChart').getContext('2d');
    const testSelector = document.getElementById('testSelector');
    const loadTestButton = document.getElementById('loadTestButton');
    const viewHistoryButton = document.getElementById('viewHistoryButton');
    const clearHistoryButton = document.getElementById('clearHistoryButton');

    // Cargar un test por defecto al iniciar la página
    loadTest(testSelector.value);

    loadTestButton.addEventListener('click', () => {
        const selectedTest = testSelector.value;
        loadTest(selectedTest);
    });

    viewHistoryButton.addEventListener('click', renderHistory);

    clearHistoryButton.addEventListener('click', clearHistory);

    function loadTest(testFile) {
        fetch(`tests/${testFile}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data.questions || !Array.isArray(data.questions)) {
                    throw new Error('El archivo JSON no tiene la estructura esperada.');
                }
                renderTest(data, testFile);
            })
            .catch(error => {
                console.error('Error al cargar el test:', error);
                testContainer.innerHTML = `<p>Error al cargar el test: ${error.message}. Por favor, inténtalo de nuevo.</p>`;
            });
    }

    function renderTest(testData, testFile) {
        testContainer.innerHTML = '';
        testData.questions.forEach((question, index) => {
            const questionElement = document.createElement('div');
            questionElement.innerHTML = `
                <p>${index + 1}. ${question.question}</p>
                <ul>
                    ${question.options.map((option, i) => `
                        <li>
                            <label>
                                <input type="radio" name="question${index}" value="${option.split(')')[0]}">
                                ${option}
                            </label>
                        </li>
                    `).join('')}
                </ul>
                <div class="correct-answer" id="correct-answer-${index}" style="display: none;">
                    <strong>Respuesta correcta:</strong> ${question.correctAnswer}
                </div>
            `;
            testContainer.appendChild(questionElement);
        });

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Enviar';
        submitButton.addEventListener('click', () => {
            const results = [];
            testData.questions.forEach((question, index) => {
                const selectedOption = document.querySelector(`input[name="question${index}"]:checked`);
                results.push(selectedOption ? selectedOption.value === question.correctAnswer : false);
                const correctAnswerElement = document.getElementById(`correct-answer-${index}`);
                if (correctAnswerElement) correctAnswerElement.style.display = 'block';
            });
            saveResults(results, testFile);
            renderChart(results);
            showResultsMessage(results, testData.questions.length);
        });
        testContainer.appendChild(submitButton);
    }

    function saveResults(results, testFile) {
        const date = new Date().toLocaleDateString();
        const storedResults = JSON.parse(localStorage.getItem('testResults')) || [];
        storedResults.push({ date, results, test: testFile });
        localStorage.setItem('testResults', JSON.stringify(storedResults));
    }

    function renderChart(results) {
        new Chart(resultsChart, {
            type: 'bar',
            data: {
                labels: results.map((_, index) => `Pregunta ${index + 1}`),
                datasets: [{
                    label: 'Resultados',
                    data: results.map(result => result ? 1 : 0),
                    backgroundColor: results.map(result => result ? 'green' : 'red')
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1
                    }
                }
            }
        });
    }

    function renderHistory() {
        const storedResults = JSON.parse(localStorage.getItem('testResults')) || [];
        testContainer.innerHTML = '';

        if (storedResults.length === 0) {
            testContainer.innerHTML = `<p>No hay resultados guardados.</p>`;
            return;
        }

        const historyElement = document.createElement('div');
        historyElement.innerHTML = `
            <h2>Historial de Resultados</h2>
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Test</th>
                        <th>Aciertos</th>
                        <th>Total Preguntas</th>
                        <th>Porcentaje</th>
                    </tr>
                </thead>
                <tbody>
                    ${storedResults.map(entry => `
                        <tr>
                            <td>${entry.date}</td>
                            <td>${entry.test.replace('.json', '')}</td>
                            <td>${entry.results.filter(result => result).length}</td>
                            <td>${entry.results.length}</td>
                            <td>${((entry.results.filter(result => result).length / entry.results.length) * 100).toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        testContainer.appendChild(historyElement);
    }

    function clearHistory() {
        if (confirm('¿Estás seguro de que quieres borrar el historial?')) {
            localStorage.removeItem('testResults');
            testContainer.innerHTML = `<p>El historial ha sido borrado.</p>`;
        }
    }

    function showResultsMessage(results, totalQuestions) {
        const correctAnswers = results.filter(result => result).length;
        const percentage = ((correctAnswers / totalQuestions) * 100).toFixed(2);

        const message = document.createElement('div');
        message.classList.add('results-message');
        message.innerHTML = `
            <h2>Resultados del Test</h2>
            <p>Respuestas correctas: ${correctAnswers} de ${totalQuestions}</p>
            <p>Porcentaje de aciertos: ${percentage}%</p>
        `;
        testContainer.appendChild(message);
    }
});