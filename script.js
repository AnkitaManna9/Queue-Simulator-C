/* ==========================================
   QUEUELAB - FIFO QUEUE SIMULATOR
   JAVASCRIPT SIMULATION ENGINE
========================================== */


/* ==========================================
   1. FIFO QUEUE DATA STRUCTURE
========================================== */

class FIFOQueue {

    constructor() {
        this.items = [];
    }

    // Add element at rear
    enqueue(element) {
        this.items.push(element);
    }

    // Remove element from front
    dequeue() {
        if (this.isEmpty()) {
            return null;
        }

        return this.items.shift();
    }

    // View front element
    peek() {
        if (this.isEmpty()) {
            return null;
        }

        return this.items[0];
    }

    // Check whether queue is empty
    isEmpty() {
        return this.items.length === 0;
    }

    // Return queue size
    size() {
        return this.items.length;
    }

    // Return queue contents
    getItems() {
        return [...this.items];
    }

    // Clear queue
    clear() {
        this.items = [];
    }
}


/* ==========================================
   2. GLOBAL SIMULATION VARIABLES
========================================== */

let queue = new FIFOQueue();

let currentMode = "ticket";

let currentTick = 0;
let nextEntityID = 1;

let totalArrivals = 0;
let totalServed = 0;
let totalWaitingTime = 0;

let maxQueueLength = 0;
let busyTicks = 0;

let serverBusyUntil = 0;
let currentEntity = null;

let simulationInterval = null;
let isRunning = false;

let activityRecords = [];
let queueHistory = [];

let queueChart = null;
let performanceChart = null;


/* ==========================================
   3. CREATE AN ENTITY
========================================== */

function createEntity(name, serviceTime, pages = 0) {

    return {
        id: nextEntityID++,
        name: name,
        type: currentMode === "ticket" ? "Customer" : "Print Job",
        arrivalTime: currentTick,
        serviceStart: null,
        completionTime: null,
        serviceTime: serviceTime,
        waitingTime: 0,
        pages: pages
    };

}


/* ==========================================
   4. CHANGE SIMULATION MODE
========================================== */

function setMode(mode) {

    if (isRunning) {
        pauseSimulation();
    }

    currentMode = mode;

    document.getElementById("ticketMode")
        .classList.toggle("active", mode === "ticket");

    document.getElementById("printerMode")
        .classList.toggle("active", mode === "printer");

    document.getElementById("printerSettings")
        .classList.toggle("hidden", mode !== "printer");

    document.getElementById("entityName").placeholder =
        mode === "ticket"
            ? "Enter customer name"
            : "Enter print job name";

    resetSimulation();

    showMessage(
        mode === "ticket"
            ? "Ticket Counter mode selected."
            : "Printer Queue mode selected."
    );

}


/* ==========================================
   5. RANDOM ARRIVAL GENERATOR
========================================== */

function generateArrival() {

    const probability = Number(
        document.getElementById("arrivalProbability").value
    );

    const randomNumber = Math.random();

    if (randomNumber <= probability) {

        const minService = Number(
            document.getElementById("minService").value
        );

        const maxService = Number(
            document.getElementById("maxService").value
        );

        let serviceTime;
        let pages = 0;
        let name;

        if (currentMode === "ticket") {

            serviceTime =
                Math.floor(
                    Math.random() * (maxService - minService + 1)
                ) + minService;

            name = "Customer";

        } else {

            // Printer jobs: 5 pages = 1 service tick

            pages =
                (Math.floor(Math.random() * 5) + 1) * 5;

            serviceTime = Math.ceil(pages / 5);

            name = "Print Job";

        }

        const entity = createEntity(
            name,
            serviceTime,
            pages
        );

        queue.enqueue(entity);

        totalArrivals++;

        updateMaxQueue();

        showMessage(
            `${entity.type} #${entity.id} joined the queue.`
        );

    }

}


/* ==========================================
   6. UPDATE MAXIMUM QUEUE LENGTH
========================================== */

function updateMaxQueue() {

    if (queue.size() > maxQueueLength) {
        maxQueueLength = queue.size();
    }

}


/* ==========================================
   7. START SERVING NEXT ENTITY
========================================== */

function startService() {

    if (currentEntity !== null || queue.isEmpty()) {
        return;
    }

    currentEntity = queue.dequeue();

    currentEntity.serviceStart = currentTick;

    currentEntity.waitingTime =
        currentTick - currentEntity.arrivalTime;

    totalWaitingTime += currentEntity.waitingTime;

    serverBusyUntil =
        currentTick + currentEntity.serviceTime;

    showMessage(
        `${currentEntity.type} #${currentEntity.id} started service.`
    );

}


/* ==========================================
   8. COMPLETE SERVICE
========================================== */

function completeService() {

    if (currentEntity === null) {
        return;
    }

    currentEntity.completionTime = currentTick;

    totalServed++;

    activityRecords.push({

        id: currentEntity.id,

        type: currentEntity.type,

        name: currentEntity.name,

        arrival: currentEntity.arrivalTime,

        start: currentEntity.serviceStart,

        completion: currentEntity.completionTime,

        waiting: currentEntity.waitingTime,

        service: currentEntity.serviceTime,

        pages: currentEntity.pages

    });

    showMessage(
        `${currentEntity.type} #${currentEntity.id} completed service.`
    );

    currentEntity = null;

}


/* ==========================================
   9. SIMULATION ENGINE
========================================== */

function simulationStep() {

    const duration = Number(
        document.getElementById("duration").value
    );

    currentTick++;

    // Check if current service is complete
    if (
        currentEntity !== null &&
        currentTick >= serverBusyUntil
    ) {
        completeService();
    }

    // Generate new arrivals
    generateArrival();

    // Start next service if server is idle
    if (currentEntity === null && !queue.isEmpty()) {
        startService();
    }

    // Track server busy time
    if (currentEntity !== null) {
        busyTicks++;
    }

    // Update maximum queue length
    updateMaxQueue();

    // Store queue length history
    queueHistory.push({
        tick: currentTick,
        length: queue.size()
    });

    // Update website
    updateDashboard();

    updateCharts();

    // Stop at selected duration
    if (currentTick >= duration) {

        pauseSimulation();

        showMessage("Simulation completed successfully!");

    }

}


/* ==========================================
   10. START SIMULATION
========================================== */

function startSimulation() {

    const duration = Number(
        document.getElementById("duration").value
    );

    const probability = Number(
        document.getElementById("arrivalProbability").value
    );

    const minService = Number(
        document.getElementById("minService").value
    );

    const maxService = Number(
        document.getElementById("maxService").value
    );

    // Input validation
    if (
        !Number.isInteger(duration) ||
        duration <= 0 ||
        !Number.isFinite(probability) ||
        probability < 0 ||
        probability > 1 ||
        !Number.isInteger(minService) ||
        !Number.isInteger(maxService) ||
        minService <= 0 ||
        maxService < minService
    ) {

        alert(
            "Please enter valid simulation settings.\n\n" +
            "Duration must be positive.\n" +
            "Arrival probability must be between 0 and 1.\n" +
            "Service times must be positive integers."
        );

        return;
    }

    if (currentTick >= duration) {
        alert("Simulation has ended. Please reset it to run again.");
        return;
    }

    if (isRunning) {
        return;
    }

    isRunning = true;

    simulationInterval = setInterval(
        simulationStep,
        400
    );

    showMessage("Simulation started.");

}


/* ==========================================
   11. PAUSE SIMULATION
========================================== */

function pauseSimulation() {

    if (simulationInterval !== null) {

        clearInterval(simulationInterval);

        simulationInterval = null;

    }

    isRunning = false;

}


/* ==========================================
   12. RESET SIMULATION
========================================== */

function resetSimulation() {

    pauseSimulation();

    queue.clear();

    currentTick = 0;
    nextEntityID = 1;

    totalArrivals = 0;
    totalServed = 0;
    totalWaitingTime = 0;

    maxQueueLength = 0;
    busyTicks = 0;

    serverBusyUntil = 0;
    currentEntity = null;

    activityRecords = [];
    queueHistory = [];

    updateDashboard();

    updateCharts();

    showMessage("Simulation has been reset.");

}


/* ==========================================
   13. MANUAL ENQUEUE
========================================== */

function enqueueManual() {

    const nameInput =
        document.getElementById("entityName");

    const name = nameInput.value.trim();

    if (name === "") {

        alert("Please enter a name first.");

        return;
    }

    let serviceTime;
    let pages = 0;

    if (currentMode === "printer") {

        pages = Number(
            document.getElementById("pages").value
        );

        if (!Number.isInteger(pages) || pages <= 0) {

            alert("Please enter a valid page count.");

            return;
        }

        serviceTime = Math.ceil(pages / 5);

    } else {

        const minService = Number(
            document.getElementById("minService").value
        );

        const maxService = Number(
            document.getElementById("maxService").value
        );

        if (
            !Number.isInteger(minService) ||
            !Number.isInteger(maxService) ||
            minService <= 0 ||
            maxService < minService
        ) {

            alert("Please enter valid service time settings.");

            return;
        }

        serviceTime =
            Math.floor(
                Math.random() * (maxService - minService + 1)
            ) + minService;

    }

    const entity = createEntity(
        name,
        serviceTime,
        pages
    );

    queue.enqueue(entity);

    totalArrivals++;

    updateMaxQueue();

    updateDashboard();

    nameInput.value = "";

    showMessage(
        `${name} successfully added to the rear of the queue.`
    );

}


/* ==========================================
   14. MANUAL DEQUEUE
========================================== */

function dequeueManual() {

    if (queue.isEmpty()) {

        showMessage("Cannot dequeue: Queue is empty.");

        return;
    }

    const entity = queue.dequeue();

    entity.serviceStart = currentTick;

    entity.waitingTime =
        currentTick - entity.arrivalTime;

    entity.completionTime = currentTick;

    totalWaitingTime += entity.waitingTime;

    totalServed++;

    activityRecords.push({

        id: entity.id,

        type: entity.type,

        name: entity.name,

        arrival: entity.arrivalTime,

        start: entity.serviceStart,

        completion: entity.completionTime,

        waiting: entity.waitingTime,

        service: entity.serviceTime,

        pages: entity.pages

    });

    updateDashboard();

    updateCharts();

    showMessage(
        `${entity.name} removed from the front of the queue.`
    );

}


/* ==========================================
   15. PEEK OPERATION
========================================== */

function peekQueue() {

    const entity = queue.peek();

    if (entity === null) {

        showMessage("Queue is empty. Nothing to peek.");

        return;
    }

    showMessage(
        `Next entity to be served: ${entity.name} (ID: ${entity.id})`
    );

}


/* ==========================================
   16. DISPLAY OPERATION MESSAGE
========================================== */

function showMessage(message) {

    const element =
        document.getElementById("operationMessage");

    if (element) {
        element.textContent = message;
    }

}


/* ==========================================
   17. UPDATE QUEUE VISUALIZATION
========================================== */

function updateQueueDisplay() {

    const container =
        document.getElementById("queueContainer");

    container.innerHTML = "";

    if (queue.isEmpty()) {

        container.innerHTML =
            '<p class="empty-message">Your queue is empty. Start the simulation!</p>';

        return;
    }

    const items = queue.getItems();

    items.forEach((entity, index) => {

        const card = document.createElement("div");

        card.className =
            index === 0
                ? "queue-item front"
                : "queue-item";

        const heading = document.createElement("strong");
        heading.textContent = entity.name;

        const details = document.createElement("small");

        details.textContent =
            `ID: #${entity.id} | ${entity.serviceTime} ticks`;

        card.appendChild(heading);
        card.appendChild(details);

        container.appendChild(card);

    });

}


/* ==========================================
   18. UPDATE DASHBOARD
========================================== */

function updateDashboard() {

    document.getElementById("totalArrivals")
        .textContent = totalArrivals;

    document.getElementById("totalServed")
        .textContent = totalServed;

    const averageWaitingTime =
        totalServed > 0
            ? totalWaitingTime / totalServed
            : 0;

    document.getElementById("avgWait")
        .textContent = averageWaitingTime.toFixed(2);

    document.getElementById("maxQueue")
        .textContent = maxQueueLength;

    document.getElementById("queueSize")
        .textContent = queue.size();

    document.getElementById("currentTick")
        .textContent = currentTick;

    const duration = Number(
        document.getElementById("duration").value
    );

    const utilization =
        duration > 0
            ? (busyTicks / duration) * 100
            : 0;

    document.getElementById("utilization")
        .textContent = utilization.toFixed(2) + "%";

    document.getElementById("serverStatus")
        .textContent =
            currentEntity !== null ? "BUSY" : "IDLE";

    document.getElementById("serverMessage")
        .textContent =
            currentEntity !== null
                ? "Server is currently processing a request."
                : "Waiting for the next request.";

    document.getElementById("currentEntity")
        .textContent =
            currentEntity !== null
                ? `${currentEntity.name} (ID: #${currentEntity.id})`
                : "No entity being served";

    updateQueueDisplay();

    updateActivityTable();

}


/* ==========================================
   19. UPDATE ACTIVITY TABLE
========================================== */

function updateActivityTable() {

    const table =
        document.getElementById("activityTable");

    table.innerHTML = "";

    if (activityRecords.length === 0) {

        table.innerHTML =
            '<tr><td colspan="6" class="empty-table">No transactions recorded yet.</td></tr>';

        return;
    }

    activityRecords.forEach(record => {

        const row = document.createElement("tr");

        const values = [

            "#" + record.id,

            record.name,

            record.arrival,

            record.start,

            record.completion,

            record.waiting

        ];

        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });

        table.appendChild(row);

    });

}


/* ==========================================
   20. CSV EXPORT
========================================== */

function exportCSV() {

    if (activityRecords.length === 0) {

        alert("No completed transactions available to export.");

        return;
    }

    const headers = [

        "Entity_ID",
        "Domain_Type",
        "Entity_Name",
        "Arrival_Tick",
        "Start_Tick",
        "Completion_Tick",
        "Wait_Duration",
        "Service_Duration",
        "Pages"

    ];

    const rows = activityRecords.map(record => [

        record.id,
        record.type,
        record.name,
        record.arrival,
        record.start,
        record.completion,
        record.waiting,
        record.service,
        record.pages

    ]);

    const csvContent = [

        headers,
        ...rows

    ].map(row =>

        row.map(value =>

            '"' + String(value).replace(/"/g, '""') + '"'

        ).join(",")

    ).join("\n");

    const blob = new Blob(

        ["\uFEFF" + csvContent],

        { type: "text/csv;charset=utf-8;" }

    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "queue_simulation_report.csv";

    link.click();

    URL.revokeObjectURL(url);

}


/* ==========================================
   21. INITIALIZE PERFORMANCE CHARTS
========================================== */

function initializeCharts() {

    if (typeof Chart === "undefined") {
        return;
    }

    const queueContext =
        document.getElementById("queueChart");

    const performanceContext =
        document.getElementById("performanceChart");

    if (!queueContext || !performanceContext) {
        return;
    }

    queueChart = new Chart(queueContext, {

        type: "line",

        data: {

            labels: [],

            datasets: [{

                label: "Queue Length",

                data: [],

                borderColor: "#326de0",

                backgroundColor: "rgba(50,109,224,0.12)",

                fill: true,

                tension: 0.35

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: true,

            scales: {

                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }

            }

        }

    });


    performanceChart = new Chart(performanceContext, {

        type: "bar",

        data: {

            labels: [
                "Arrivals",
                "Served",
                "Waiting"
            ],

            datasets: [{

                label: "Performance",

                data: [0, 0, 0],

                backgroundColor: [
                    "#326de0",
                    "#26b98a",
                    "#f0a54a"
                ],

                borderRadius: 7

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: true,

            scales: {

                y: {
                    beginAtZero: true
                }

            }

        }

    });

}


/* ==========================================
   22. UPDATE CHARTS
========================================== */

function updateCharts() {

    if (queueChart !== null) {

        queueChart.data.labels =
            queueHistory.map(item => item.tick);

        queueChart.data.datasets[0].data =
            queueHistory.map(item => item
