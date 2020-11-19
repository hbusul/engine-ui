import React, { useEffect, useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import Table from "./Table";
import TimeDiffDisplay from "./TimeDiffDisplay";

const Usage = () => {

    const { username } = useParams();
    const [data, setData] = useState([]);
    const [recursive, setRecursive] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const [totalSolveTime, setTotalSolveTime] = useState(0);
    const [refresh, setRefresh] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
    const [endDate, setEndDate] = useState(new Date());
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server, roles }] = useContext(AuthContext);
    const [displayFields] = useState([
        {
            field: "username",
            column: "User",
            sorter: "alphabetical",
            displayer: String
        },
        {
            field: "nojobs",
            column: "Number jobs",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "nocrash",
            column: "Number crashes",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "queuetime",
            column: "Time in queue",
            sorter: "numerical",
            displayer: e => <TimeDiffDisplay time={e} classNames="badge" />
        },
        {
            field: "solvetime",
            column: "Solve time",
            sorter: "numerical",
            displayer: e => <TimeDiffDisplay time={e} classNames="badge" />
        },
        {
            field: "totaltime",
            column: "Total time",
            sorter: "numerical",
            displayer: e => <TimeDiffDisplay time={e} classNames="badge" />
        }
    ]);

    useEffect(() => {
        if (!roles.includes('admin')) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        axios
            .get(`${server}/usage/`, {
                params: {
                    recursive: recursive,
                    username: username,
                    from_datetime: startDate,
                    to_datetime: endDate
                }
            })
            .then(res => {
                if (res.status !== 200) {
                    setAlertMsg("Problems fetching usage information.");
                    setIsLoading(false);
                    return;
                }
                const aggregatedUsageData = Object.values(res.data.job_usage.reduce((a, c) => {
                    const isFinished = c.finished != null;
                    let solveTime;
                    if (isFinished && (c.times.length === 0 || c.times[c.times.length - 1].finish == null)) {
                        solveTime = 0;
                    } else {
                        solveTime = (new Date(isFinished && c.times[c.times.length - 1].finish) -
                            new Date(c.times[c.times.length - 1].start)) / 1000;
                    }
                    if (a[c.username]) {
                        // User already exists
                        a[c.username].solvetime += solveTime;
                        a[c.username].totaltime += (new Date(isFinished && c.finished) -
                            new Date(c.submitted)) / 1000;
                        a[c.username].queuetime += c.times.length ?
                            (new Date(c.times[0].start) - new Date(c.submitted)) / 1000 : 0;
                        a[c.username].nocrash += Math.max(0, c.times.length - 1);
                        a[c.username].nojobs += 1;
                        return a;
                    }
                    a[c.username] = {
                        username: c.username,
                        nojobs: 1,
                        nocrash: Math.max(0, c.times.length - 1),
                        queuetime: c.times.length ? (new Date(c.times[0].start) - new Date(c.submitted)) / 1000 : 0,
                        solvetime: solveTime,
                        totaltime: (new Date(isFinished && c.finished) - new Date(c.submitted)) / 1000
                    };
                    return a;
                }, Object.create(null)));
                setData(aggregatedUsageData);
                setTotalSolveTime(aggregatedUsageData.reduce((a, c) => {
                    if (isNaN(c.solvetime)) {
                        return a;
                    }
                    return a + c.solvetime;
                }, 0));
                setTotalTime(aggregatedUsageData.reduce((a, c) => {
                    return a + c.totaltime;
                }, 0));
                setIsLoading(false);
            })
            .catch(err => {
                setAlertMsg(`Problems fetching usage information. Error message: ${err.message}`);
                setIsLoading(false);
            });
    }, [jwt, server, roles, refresh, displayFields, setAlertMsg,
        username, recursive, startDate, endDate]);

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Usage</h1>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group mr-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                setRefresh(refresh + 1);
                            }}
                        >
                            Refresh
                    <RefreshCw width="12px" className="ml-2" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col-lg-4 col-sm-12 mb-4">
                    <label>
                        Show invitees?
                        <input
                            name="showinvitees"
                            type="checkbox"
                            className="ml-2"
                            checked={recursive}
                            onChange={e => {
                                setRecursive(e.target.checked)
                            }} />
                    </label>
                </div>
                <div className="col-lg-4 col-sm-6 col-12 mb-4">
                    <div className="row">
                        <div className="col-4">From:</div>
                        <div className="col-8">
                            <DatePicker selected={startDate} onChange={date => setStartDate(date)} />
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 col-sm-6 col-12 mb-4">
                    <div className="row">
                        <div className="col-4">To:</div>
                        <div className="col-8">
                            <DatePicker selected={endDate} onChange={date => setEndDate(date)} />
                        </div>
                    </div>
                </div>
            </div>
            {data.length > 1 &&
                <div className="row">
                    <div className="col-md-6 col-12 mb-2">
                        <small>
                            <div className="row">
                                <div className="col-4">
                                    Total time:
                                </div>
                                <div className="col-8">
                                    <TimeDiffDisplay time={totalTime} classNames="badge badge-secondary" />
                                </div>
                            </div>
                        </small>
                    </div>
                    <div className="col-md-6 col-12 mb-2">
                        <small>
                            <div className="row">
                                <div className="col-4">
                                    Total solve time:
                                </div>
                                <div className="col-8">
                                    <TimeDiffDisplay time={totalSolveTime} classNames="badge badge-secondary" />
                                </div>
                            </div>
                        </small>
                    </div>
                </div>}
            <Table data={data}
                noDataMsg="No Usage data found"
                displayFields={displayFields}
                sortedAsc={false}
                isLoading={isLoading}
                sortedCol="username"
                idFieldName="username" />
        </div>
    );
};

export default Usage;
