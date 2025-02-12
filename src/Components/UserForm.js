import React, { useState } from "react";
import "../Styles/UserForm.css";
import axios from "axios";
import { toast } from "react-toastify";
import ThankYou from '../Components/ThankYou';

const UserForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSelectTimeVisible, setIsSelectTimeVisible] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    number_of_sessions: "1",
    appointmentDate: "",
    startTime: "",
    endTime: "",
    createDate: new Date().toISOString().split("T")[0],
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [appointments, setAppointments] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [minDate, setMinDate] = useState("");
  const [isAppointmentDateVisible, setIsAppointmentDateVisible] =
    useState(false);
  const [availableSlots, setAvailableSlots] = useState(null);

  const handleDateChange = async (selectedDate) => {
    if (!selectedAppointment) return;

    const selectedDateObj = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Remove time part for comparison

    const recentSessionDate = new Date(
      Math.max(
        ...selectedAppointment.sessions.map(
          (session) => new Date(session.session_date)
        )
      )
    );

    // Calculate the valid date range (90 days to 1 year after recent session date)
    const minAllowedDate = new Date(recentSessionDate);
    minAllowedDate.setDate(minAllowedDate.getDate() + 90); // 90 days after session_date

    const maxAllowedDate = new Date(recentSessionDate);
    maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() + 1); // 1 year validity

    // Validate selected date
    if (selectedDateObj < today) {
      toast.error("You cannot select a past date.");
      setIsSelectTimeVisible(false);
      setAvailableSlots(null);
      return;
    }

    if (selectedDateObj < minAllowedDate || selectedDateObj > maxAllowedDate) {
      toast.error(
        `You can only book a touchup between ${
          minAllowedDate.toISOString().split("T")[0]
        } and ${maxAllowedDate.toISOString().split("T")[0]}.`
      );
      setIsSelectTimeVisible(false);
      setAvailableSlots(null);
      return;
    }

    // Reset error and fetch available slots
    setErrorMessage("");
    setIsSelectTimeVisible(true);
    setFormData({ ...formData, appointmentDate: selectedDate });

    try {
      const response = await fetch(
        `https://apptbackend.cercus.app/get-touchup-availableslot/?appointment_id=${selectedAppointment.appointment_id}&session_date=${selectedDate}`
      );
      const data = await response.json();

      if (data.available_slots) {
        setAvailableSlots(data.available_slots);
      } else {
        setAvailableSlots(null);
        toast.error("No available slots for this date.");
      }
    } catch (error) {
      setAvailableSlots(null);
      toast.error("Error fetching available slots.");
    }
  };

  const handleGetAppointmentDetails = async (e) => {
    e.preventDefault(); // Prevent default form submission

    const { email, createDate, startTime, endTime, appointmentSelect } =
      formData;

    // Validate input fields
    if (!formData.firstname) {
      toast.error("Please enter your first name.");
      return;
    }

    if (!formData.lastname) {
      toast.error("Please enter your last name.");
      return;
    }

    // Validate email with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!email) {
      toast.error("Please enter your email before proceeding.");
      return;
    }

    // Fetch appointments only when the user submits the form
    try {
      const response = await fetch(
        `https://apptbackend.cercus.app/get-complted-sessions-for-touchup/?email=${email}`
      );
      const data = await response.json();

      if (data.upcoming_appointments.length === 0) {
        toast.error("No appointment scheduled");
        setAppointments(null);
      } else {
        setErrorMessage("");
        const uniqueAppointments = removeDuplicates(data.upcoming_appointments);
        setAppointments(uniqueAppointments);
      }
    } catch (error) {
      toast.error("Error fetching appointments");
      setAppointments(null);
    }
  };

  const handleCreateTouchupSession = async (e) => {
    e.preventDefault(); // Prevent form submission default behavior

    // Set createDate to the current date
    const currentDate = new Date().toISOString().split("T")[0];


    try {
      const response = await axios.post(
        "https://apptbackend.cercus.app/create-touchup-session/",
        {
          firstname: formData.firstname,
          lastname: formData.lastname,
          email: formData.email,
          phone: formData.phone,
          number_of_sessions: formData.number_of_sessions,
          createDate: currentDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          appointment_id: selectedAppointment.appointment_id,
          appointmentDate: formData.appointmentDate
        }
      );

      if (response.status === 201) {
        toast.success("Touchup session created successfully!");
        
        setIsSubmitted(true);
        // Reset form data
        setFormData({
          firstname: "",
          lastname: "",
          email: "",
          phone: "",
          number_of_sessions: "1",
          appointmentDate: "",
          startTime: "",
          endTime: "",
          createDate: new Date().toISOString().split("T")[0],
        });
        setSelectedAppointment(null);
        setAppointments(null);
        setIsAppointmentDateVisible(false);
        setIsSelectTimeVisible(false);
        setAvailableSlots(null);
      } else {
        toast.error("Failed to create touchup session. Please try again.");
      }
    } catch (error) {
      console.error("Error creating touchup sessions:", error);
      toast.error("An error occurred while creating the touchup sessions.");
    }
  };

  const handleEmailChange = (email) => {
    setFormData({ ...formData, email });
  };

  const removeDuplicates = (appointments) => {
    const uniqueAppointments = [];
    const appointmentIds = new Set();

    appointments.forEach((appointment) => {
      if (!appointmentIds.has(appointment.appointment_id)) {
        uniqueAppointments.push(appointment);
        appointmentIds.add(appointment.appointment_id);
      }
    });

    return uniqueAppointments;
  };

  const handleAppointmentChange = (appointmentId) => {
    const appointment = appointments.find(
      (app) => app.appointment_id === Number(appointmentId)
    );

    if (appointment) {
      setSelectedAppointment(appointment); 

      // Get the latest session date
      const latestSessionDate = new Date(
        Math.max(
          ...appointment.sessions.map(
            (session) => new Date(session.session_date)
          )
        )
      );

      setMinDate(latestSessionDate.toISOString().split("T")[0]);

      // Calculate days since the latest session
      const currentDate = new Date();
      const diffDays = Math.ceil(
        (currentDate - latestSessionDate) / (1000 * 60 * 60 * 24)
      );

      if (diffDays >= 90 && diffDays <= 365) {
        setErrorMessage("");
        setIsSelectTimeVisible(true);
        setIsAppointmentDateVisible(true);
      } else if (diffDays > 365) {
        setErrorMessage(
          "The appointment is no longer valid as it exceeds 1 year from the latest session date."
        );
        setIsSelectTimeVisible(false);
        setIsAppointmentDateVisible(false);
        toast.error("No Appointment can be handled this time.");
      } else {
        setErrorMessage(
          "After completing 90 days, you can select a time for touchup."
        );
        toast.error("No Appointment can be handled this time.");
        setIsSelectTimeVisible(false);
        setIsAppointmentDateVisible(false);
      }
    } else {
      setSelectedAppointment(null);
      toast.error("Invalid appointment selection.");
    }
  };

  const handleStartTimeChange = (startTime) => {
    setFormData({ ...formData, startTime });
  };

  const getFilteredEndTimes = () => {
    if (!formData.startTime) return availableSlots?.end_times || [];

    const startTimeIndex = availableSlots.start_times.indexOf(
      formData.startTime
    );
    const filteredEndTimes = availableSlots.end_times.filter(
      (_, idx) => idx > startTimeIndex
    );

    // Add half-hour variations
    const halfHourVariations = [];
    filteredEndTimes.forEach((time) => {
      const [hour, minutePart] = time.split(":");
      const [minute, period] = minutePart.split(" ");

      const nextHalfHour = minute === "00" ? "30" : "00";
      const nextHour =
        minute === "00"
          ? hour
          : (parseInt(hour) + 1).toString().padStart(2, "0");
      const nextPeriod =
        nextHour === "12" ? (period === "AM" ? "PM" : "AM") : period;

      const halfHourTime = `${nextHour}:${nextHalfHour} ${nextPeriod}`;
      halfHourVariations.push(halfHourTime);
    });

    // Include the next half-hour time after the selected start time
    const [startHour, startMinutePart] = formData.startTime.split(":");
    const [startMinute, startPeriod] = startMinutePart.split(" ");

    const nextHalfHour = startMinute === "00" ? "30" : "00";
    const nextHour =
      startMinute === "00"
        ? startHour
        : (parseInt(startHour) + 1).toString().padStart(2, "0");
    const nextPeriod =
      nextHour === "12" ? (startPeriod === "AM" ? "PM" : "AM") : startPeriod;

    const nextHalfHourTime = `${nextHour}:${nextHalfHour} ${nextPeriod}`;

    return [nextHalfHourTime, ...filteredEndTimes, ...halfHourVariations];
  };

  return (

    isSubmitted
    ?
    <ThankYou />
    :

    <div className="form-container">
      <h2>Touch Up Session  </h2>
      <form onSubmit={handleCreateTouchupSession}>
        <div className="two-column-layout">
          <div className="form-group">
            <label htmlFor="firstname">First Name *</label>
            <input
              type="text"
              id="firstname"
              name="firstname"
              value={formData.firstname}
              onChange={(e) =>
                setFormData({ ...formData, firstname: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="lastname">Last Name *</label>
            <input
              type="text"
              id="lastname"
              name="lastname"
              value={formData.lastname}
              onChange={(e) =>
                setFormData({ ...formData, lastname: e.target.value })
              }
              required
            />
          </div>
        </div>
        <div className="two-column-layout">
          <div className="form-group">
            <label htmlFor="phone">Phone Number </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
            />
          </div>
        </div>

        {appointments && appointments.length > 0 && (
          <div className="form-group">
            <label htmlFor="appointmentSelect">Select Appointment:</label>
            <select
              id="appointmentSelect"
              onChange={(e) => handleAppointmentChange(e.target.value)}
              value={
                selectedAppointment ? selectedAppointment.appointment_id : ""
              }
            >
              <option value="">Select an appointment</option>
              {appointments.map((appointment) => (
                <option
                  key={appointment.appointment_id}
                  value={appointment.appointment_id}
                >
                  {appointment.appointment_title}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedAppointment && (
          <div className="appointment-details">
            <h3 style={{ marginBottom: "1rem" }}>Appointment Details:</h3>
            <h4 style={{ marginBottom: "1rem" }}>
              {selectedAppointment.appointment_title}
            </h4>
            

            <div className="appointment-item">
              <div className="two-column-layout">
                <div className="form-group">
                  <label>Appointment Tatoo Idea</label>
                  <input
                    type="text"
                    value={selectedAppointment.tatto_idea}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Appointment Location</label>
                  <input
                    type="text"
                    value={selectedAppointment.appointment_location}
                    disabled
                  />
                </div>
              </div>
              <div className="two-column-layout">
                <div className="form-group">
                  <label>Appointment Count</label>
                  <input
                    type="text"
                    value={selectedAppointment.appointment_count}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Created at:</label>
                  <input
                    type="text"
                    value={new Date(
                      selectedAppointment.created_at
                    ).toLocaleString()}
                    disabled
                  />
                </div>
              </div>

              <div className="sessions" style={{ marginBottom: "1rem" }}>
                {selectedAppointment.sessions.map((session, sessionIndex) => (
                  <div key={sessionIndex} className="session-item">
                    <p style={{ marginBottom: "1rem" }}>
                      Session {session.session_no}: {session.session_date} from{" "}
                      {session.start_time} to {session.end_time}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {isAppointmentDateVisible && (
          <div className="two-column-layout">
            <div className="form-group">
              <label htmlFor="appointmentDate">Select Appointment Date:</label>
              <input
                type="date"
                id="appointmentDate"
                name="appointmentDate"
                value={formData.appointmentDate}
                min={new Date().toISOString().split("T")[0]} // Restricts past dates
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
            {isSelectTimeVisible && availableSlots && (
              <div className="two-column-layout">
                <div className="form-group">
                  <label htmlFor="startTime">Start Time</label>
                  <select
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                  >
                    <option value="">Select Start Time</option>
                    {availableSlots.start_times.map((time, idx) => (
                      <option key={idx} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="endTime">End Time</label>
                  <select
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    disabled={!formData.startTime}
                  >
                    <option value="">Select End Time</option>
                    {getFilteredEndTimes().map((time, idx) => (
                      <option key={idx} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {appointments === null && (
          <button
            type="button"
            onClick={handleGetAppointmentDetails}
            className="btn btn-primary"
          >
            Get Valid Appointment Details (For Touchup Session)
          </button>
        )}

        {formData.endTime && (
          <button type="submit" className="btn btn-primary">
            Submit Appointment Form
          </button>
        )}
      </form>
    </div>
  );
};

export default UserForm;
