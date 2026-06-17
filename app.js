document
    .getElementById("csvFile")
    .addEventListener("change", handleUpload);

function handleUpload(event) {

    const file = event.target.files[0];

    if (!file) {
        return;
    }

    document.getElementById("status").innerText =
        "Loading CSV...";

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,

        complete: function(results) {

            buildHeatmap(results.data);

        },

        error: function(err) {

            document.getElementById("status").innerText =
                err.message;

        }
    });
}

function normalizeAuthors(authorString) {

    const authors =
        String(authorString)
            .split(",")
            .map(a => a.trim())
            .filter(Boolean);

    return [...new Set(authors)].join(", ");
}

function buildHeatmap(data) {

    // ======================================
    // READ BOOKS ONLY
    // ======================================

    data = data.filter(row =>
        row["Read Status"] &&
        row["Read Status"]
            .trim()
            .toLowerCase() === "read"
    );

    // ======================================
    // NUMERIC RATING
    // ======================================

    data = data
        .map(row => ({
            ...row,
            rating: parseFloat(row["Star Rating"])
        }))
        .filter(row => !isNaN(row.rating));

    // ======================================
    // CLEAN AUTHORS
    // ======================================

    data.forEach(row => {
        row.Authors =
            normalizeAuthors(row.Authors);
    });

    // ======================================
    // RATING BIN
    // ======================================

    data.forEach(row => {

        row.ratingBin =
            Math.round(
                row.rating / 0.25
            ) * 0.25;
    });

    // ======================================
    // RATING STEPS
    // ======================================

    const ratingSteps = [];

    for (
        let r = 0.25;
        r <= 5.0;
        r += 0.25
    ) {
        ratingSteps.push(
            Number(r.toFixed(2))
        );
    }

    // ======================================
    // AUTHORS
    // ======================================

    const authors =
        [...new Set(
            data.map(d => d.Authors)
        )].sort();

    // ======================================
    // BOOK LISTS
    // ======================================

    const cellBooks = {};

    data.forEach(book => {

        const key =
            `${book.Authors}|||${book.ratingBin}`;

        if (!cellBooks[key]) {
            cellBooks[key] = [];
        }

        cellBooks[key].push(
            book.Title
        );
    });

    // ======================================
    // HEATMAP MATRICES
    // ======================================

    const z = [];
    const hover = [];
    const text = [];

    authors.forEach(author => {

        const zRow = [];
        const hoverRow = [];
        const textRow = [];

        ratingSteps.forEach(rating => {

            const key =
                `${author}|||${rating}`;

            const books =
                cellBooks[key] || [];

            const count =
                books.length;

            zRow.push(count);

            hoverRow.push(
                books.sort().join("<br>")
            );

            textRow.push(
                count > 0
                    ? String(count)
                    : ""
            );
        });

        z.push(zRow);
        hover.push(hoverRow);
        text.push(textRow);
    });

    // ======================================
    // PLOT
    // ======================================

    Plotly.newPlot(
        "plot",
        [{
            type: "heatmap",

            z: z,

            x: ratingSteps.map(
                r => r.toFixed(2)
            ),

            y: authors,

            text: text,

            texttemplate: "%{text}",

            customdata: hover,

            hovertemplate:
                "Author: %{y}<br>" +
                "Rating: %{x}<br><br>" +
                "%{customdata}" +
                "<extra></extra>",

            colorscale: [
                [0.0, "white"],
                [0.000001, "#2b7fb6"],
                [0.33, "#66bf73"],
                [0.66, "#fcd94a"],
                [1.0, "#e51b1b"]
            ],

            showscale: false
        }],
        {
            title:
                "Rating Distribution per Author Group",

            paper_bgcolor: "#111",
            plot_bgcolor: "#111",

            font: {
                color: "#fff"
            },

            xaxis: {
                type: "category"
            },

            yaxis: {
                autorange: "reversed",
                automargin: true
            },

            height: Math.max(
                900,
                authors.length * 25
            ),

            width: 1400
        },

        {
            responsive: true
        }
    );

    document.getElementById("status")
        .innerText =
        `${data.length} books loaded`;
}