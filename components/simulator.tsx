import { Button, Container, Group, Indicator, NumberInput, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { LineChart } from '@mantine/charts';

const Simulator = () => {
    const [simulationResults, setSimulationResults] = useState<{ housePrices: number[], totalPaidIntoLoan: number[] } | null>(null);

    const [initialPropertyValue, setInitialPropertyValue] = useState<number>(289_707);
    const [initialLoanValue, setInitialLoanValue] = useState<number>(initialPropertyValue);
    const [initialInterestRate, setInitialInterestRate] = useState<number>(4.75);
    const [loanTerm, setLoanTerm] = useState<number>(30);
    const [correlation, setCorrelation] = useState<number>(-0.6);
    const [housePriceStdDev, setHousePriceStdDev] = useState<number>(0.1);
    const [interestRateStdDev, setInterestRateStdDev] = useState<number>(0.1);

    function gaussianRandom(mean=0, stdev=1) {
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        return z * stdev + mean;
    }

    function generateCorrelatedRandomVariables(rho: number): [number, number] {
        const z1 = gaussianRandom(0, housePriceStdDev);
        const z2 = gaussianRandom(0, interestRateStdDev);
        const correlatedZ2 = rho * z1 + Math.sqrt(1 - rho ** 2) * z2;
        return [z1, correlatedZ2];
    }
      
    function runSimulation() {
        let housePrice = initialPropertyValue;
        let loanAmount = initialLoanValue;
        let interestRate = initialInterestRate / 100; // Convert to decimal
        let totalPaidIntoLoan = 0;
    
        const housePrices: number[] = [housePrice];
        const totalPaid: number[] = [totalPaidIntoLoan];
    
        const timeSteps = loanTerm * 12; // Total months
        for (let t = 0; t < timeSteps; t++) {
            const [houseReturn, interestRateChange] = generateCorrelatedRandomVariables(correlation);
    
            // Update house price
            const annualHouseReturn = housePriceStdDev * houseReturn; // Annualized return
            const monthlyHouseReturn = annualHouseReturn / 12; // Convert to monthly
            const housePriceChange = housePrice * monthlyHouseReturn; // Apply return proportionally
            housePrice += housePriceChange;
    
            // Update interest rate with cap on changes to avoid runaway increases
            const interestRateDelta = interestRateStdDev * interestRateChange;
            interestRate = Math.max(0, interestRate + interestRateDelta); // Ensure non-negative interest rate
    
            // Limit interest rate fluctuations to a reasonable range
            interestRate = Math.min(0.2, Math.max(interestRate, 0.01)); // Caps between 1% and 20%
    
            // Calculate monthly payment
            const monthlyRate = interestRate / 12; // Monthly interest rate
            const remainingPeriods = timeSteps - t; // Remaining payments
            const monthlyPayment = monthlyRate > 0
                ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingPeriods))
                : loanAmount / remainingPeriods; // Handle 0% interest
    
            if (loanAmount > 0) {
                // Update loan balance
                const interestPayment = loanAmount * monthlyRate;
                const principalPayment = Math.min(loanAmount, monthlyPayment - interestPayment); // Avoid overpayment
                loanAmount -= principalPayment; // Decrease the loan balance
                totalPaidIntoLoan += monthlyPayment; // Accumulate total paid
    
                // Ensure payments stop when loan is fully paid
                if (loanAmount <= 0) {
                    loanAmount = 0;
                }
            }
    
            // Store results
            housePrices.push(housePrice);
            totalPaid.push(totalPaidIntoLoan);
        }
    
        return { housePrices, totalPaidIntoLoan: totalPaid };
    }

    const data = [];
    if (simulationResults) {
        for (let i = 0; i < simulationResults?.housePrices.length; i++) {
            data.push({
                date: i,
                'House Value (£)': simulationResults?.housePrices[i],
                'Total Paid into Loan (£)': simulationResults?.totalPaidIntoLoan[i],
                'Net Gain (£)': simulationResults?.housePrices[i] - simulationResults?.totalPaidIntoLoan[i],
            });
        }
    }

    const formatMoneyAmount = (value: number) => `£${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    
    const finalHousePrice = simulationResults?.housePrices[simulationResults?.housePrices.length - 1] ?? 0;
    const finalTotalPaid = simulationResults?.totalPaidIntoLoan[simulationResults?.totalPaidIntoLoan.length - 1] ?? 0;
    const finalEquity = finalHousePrice - finalTotalPaid;

    return (
        <Container py='xl'>
            <Stack gap='xl'>
                <Group justify='space-between'>
                    <Title>Mortgage Value Simulator</Title>
                    <Button color='orange' w={200} onClick={() => setSimulationResults(runSimulation())}>
                        Run
                    </Button>
                </Group>
                <Group justify='space-between'>
                    <Indicator color='indigo' position='middle-start' offset={-10}>
                        <Text fw={700}>Property Value: {formatMoneyAmount(finalHousePrice)}</Text>
                    </Indicator>
                    <Indicator color='teal' position='middle-start' offset={-10}>
                        <Text fw={700}>Total Paid into Loan: {formatMoneyAmount(finalTotalPaid)}</Text>
                    </Indicator>
                    <Indicator color='red' position='middle-start' offset={-10}>
                        <Text fw={700}>Net Gain: {formatMoneyAmount(finalEquity)}</Text>
                    </Indicator>
                </Group>
                <LineChart
                    h={300}
                    data={data}
                    dataKey="date"
                    valueFormatter={formatMoneyAmount}
                    series={[
                        { name: 'House Value (£)', color: 'indigo.6' },
                        { name: 'Total Paid into Loan (£)', color: 'teal.6' },
                        { name: 'Net Gain (£)', color: 'red.6' },
                    ]}
                    curveType="linear"
                    withDots={false}
                />
                <NumberInput
                    prefix='£'
                    thousandSeparator=","
                    min={0}
                    label='Initial Property value'
                    placeholder='Enter a value'
                    value={initialPropertyValue}
                    onChange={(value) => setInitialPropertyValue(typeof value === 'number' ? value : Number(value))}
                />
                <NumberInput
                    prefix='£'
                    thousandSeparator=","
                    min={0}
                    label='Initial Loan value'
                    placeholder='Enter a value'
                    value={initialLoanValue}
                    onChange={(value) => setInitialLoanValue(typeof value === 'number' ? value : Number(value))}
                />
                <NumberInput
                    suffix='%'
                    min={0}
                    max={100}
                    label='Initial Interest rate (%)'
                    placeholder='Enter a value'
                    value={initialInterestRate}
                    onChange={(value) => setInitialInterestRate(typeof value === 'number' ? value : Number(value))}
                />
                <NumberInput
                    suffix=' years'
                    min={0}
                    label='Loan Duration (years)'
                    placeholder='Enter a value'
                    value={loanTerm}
                    onChange={(value) => setLoanTerm(typeof value === 'number' ? value : Number(value))}
                />
                <NumberInput
                    min={-1}
                    max={1}
                    label='Correlation'
                    placeholder='Enter a value'
                    value={correlation}
                    onChange={(value) => setCorrelation(typeof value === 'number' ? value : Number(value))}
                />
                <NumberInput
                    min={0}
                    label='House Price Volatility'
                    placeholder='Enter a value'
                    value={housePriceStdDev}
                    onChange={(value) => setHousePriceStdDev(typeof value === 'number' ? value : Number(value))}
                />
                <NumberInput
                    min={0}
                    label='Interest Rate Volatility (%)'
                    placeholder='Enter a value'
                    value={interestRateStdDev}
                    onChange={(value) => setInterestRateStdDev(typeof value === 'number' ? value : Number(value))}
                />
            </Stack>
        </Container>
    );
} 

export default Simulator;
