import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

// Self-contained, supports both {show/onHide} and legacy {isOpen/onClose}
const AddEditRewardModal = (props) => {
  const show = props.show ?? props.isOpen ?? false;
  const onHide = props.onHide ?? props.onClose ?? (() => {});
  const editingReward = props.editingReward ?? props.initialData ?? null;
  const onSave = props.onSave ?? (() => {});

  const [form, setForm] = useState({
    name: '',
    description: '',
    requiredPoints: '',
    status: 'Active',
    expiration: '',
  });

  useEffect(() => {
    if (editingReward) {
      setForm({
        name: editingReward.name || '',
        description: editingReward.description || '',
        requiredPoints: editingReward.requiredPoints ?? '',
        status: editingReward.status || 'Active',
        expiration: editingReward.expiration || '',
      });
    } else {
      setForm({
        name: '',
        description: '',
        requiredPoints: '',
        status: 'Active',
        expiration: '',
      });
    }
  }, [editingReward, show]);

  const handleSave = () => {
    onSave({
      ...form,
      requiredPoints:
        form.requiredPoints === '' || form.requiredPoints === null
          ? ''
          : Number(form.requiredPoints),
    });
  };

  return (
    <>
      {/* Inline style to blur the bootstrap backdrop */}
      {show && (
        <style>{`
          .modal-backdrop.show {
            backdrop-filter: blur(6px);
            background-color: rgba(0,0,0,0.25);
          }
        `}</style>
      )}

      <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontWeight: 600 }}>
            {editingReward ? 'Edit Reward' : 'Add New Reward'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Reward Name</Form.Label>
              <Form.Control
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter reward name"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Required Points</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={form.requiredPoints}
                    onChange={(e) => setForm((p) => ({ ...p, requiredPoints: e.target.value }))}
                    placeholder="e.g. 10"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Expiration Date</Form.Label>
              <Form.Control
                type="date"
                value={form.expiration}
                onChange={(e) => setForm((p) => ({ ...p, expiration: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Add a short description"
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {editingReward ? 'Save Changes' : 'Add Reward'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AddEditRewardModal;
